"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/config/env";
import { authorMcqs } from "@/lib/mcq/author";
import { evaluateMcqs } from "@/lib/mcq/evaluate";
import { embedOne, toVector } from "@/lib/rag/embed";
import type { GradeResult, McqPublic, ReviewMcq } from "@/types/lesson";

const SOURCE_CHARS = 30_000;

export async function generateObjectiveMcqs(
  objectiveId: string,
): Promise<{ count: number }> {
  const supabase = await createClient();
  const model = serverEnv().LLM_MODEL;

  const { data: existing } = await supabase
    .from("mcqs")
    .select("id")
    .eq("objective_id", objectiveId)
    .limit(1);
  if (existing && existing.length) return { count: existing.length };

  const { data: obj } = await supabase
    .from("objectives")
    .select("id, lesson_id, title, section, planned_mcq_count")
    .eq("id", objectiveId)
    .single();
  if (!obj) throw new Error("objective not found");

  // Ownership verified above via the user client; the long author + jury run can
  // outlive the user's access token, so do the writes with the service role.
  const admin = createAdminClient();

  // RAG: retrieve the chunks most relevant to this objective. Falls back to raw
  // text if embeddings/chunks are unavailable.
  let source = "";
  try {
    const queryVec = await embedOne(`${obj.title}\n${obj.section ?? ""}`);
    const { data: matches } = await supabase.rpc("match_chunks", {
      p_lesson_id: obj.lesson_id,
      p_query: toVector(queryVec),
      p_limit: 12,
    });
    if (matches && matches.length) {
      source = (matches as { content: string }[])
        .map((m) => m.content)
        .join("\n\n");
    }
  } catch {
    // fall back to raw text below
  }
  if (!source) {
    const { data: pages } = await supabase
      .from("pdf_pages")
      .select("text")
      .eq("lesson_id", obj.lesson_id)
      .order("page_no");
    source = (pages ?? [])
      .map((p) => p.text)
      .join("\n\n")
      .slice(0, SOURCE_CHARS);
  }
  const count = obj.planned_mcq_count ?? 3;

  const mcqs = await authorMcqs({
    objective: obj.title,
    section: obj.section ?? "",
    source,
    count,
  });
  if (!mcqs || !mcqs.length) {
    await admin.from("generations").insert({
      lesson_id: obj.lesson_id,
      kind: "mcqs",
      model,
      status: "error",
      error: "author produced no questions",
    });
    return { count: 0 };
  }

  const verdicts = await evaluateMcqs(obj.title, source, mcqs);
  const runs = 1;

  const rows = mcqs.map((m, i) => ({
    objective_id: objectiveId,
    question: m.question,
    choices: m.choices,
    correct_index: m.correctIndex,
    explanation: m.explanation,
    choice_rationales: m.choiceRationales,
    hint: m.hint,
    grounded:
      verdicts[i]?.evaluations.find((e) => e.kind === "grounding")?.passed ?? false,
    model,
    validation_status: "valid" as const,
    eval_status: (verdicts[i]?.passed ? "passed" : "failed") as "passed" | "failed",
    eval_score: verdicts[i]?.score ?? null,
    eval_runs: runs,
    order_index: i,
  }));

  const { data: inserted, error } = await admin
    .from("mcqs")
    .insert(rows)
    .select("id");
  if (error) throw new Error(error.message);

  const evalRows: {
    mcq_id: string;
    evaluator: string;
    passed: boolean;
    score: number;
    issues: string[];
    model: string;
    run: number;
  }[] = [];
  mcqs.forEach((_, i) => {
    const mcqId = inserted?.[i]?.id as string | undefined;
    if (!mcqId) return;
    for (const e of verdicts[i]?.evaluations ?? []) {
      evalRows.push({
        mcq_id: mcqId,
        evaluator: e.kind,
        passed: e.passed,
        score: e.score,
        issues: e.issues,
        model: serverEnv().EVAL_MODEL,
        run: runs,
      });
    }
  });
  if (evalRows.length) await admin.from("mcq_evaluations").insert(evalRows);

  await admin.from("generations").insert({
    lesson_id: obj.lesson_id,
    kind: "mcqs",
    model,
    status: "ok",
    raw_output: { mcqs, verdicts },
  });

  revalidatePath(`/lessons/${obj.lesson_id}`);
  return { count: rows.length };
}

export async function getObjectiveMcqs(
  objectiveId: string,
): Promise<McqPublic[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mcqs")
    .select("id, objective_id, question, choices, order_index")
    .eq("objective_id", objectiveId)
    .order("order_index");
  if (error) throw new Error(error.message);

  return (data ?? []).map((m) => ({
    id: m.id,
    objectiveId: m.objective_id,
    question: m.question,
    choices: m.choices as [string, string, string, string],
    orderIndex: m.order_index,
  }));
}

export async function getObjectiveReview(
  objectiveId: string,
): Promise<ReviewMcq[]> {
  const supabase = await createClient();

  const { data: mcqs } = await supabase
    .from("mcqs")
    .select("id, objective_id, question, choices, order_index")
    .eq("objective_id", objectiveId)
    .order("order_index");
  if (!mcqs || !mcqs.length) return [];

  const ids = mcqs.map((m) => m.id);

  // Latest attempt per MCQ for the current user.
  const { data: attempts } = await supabase
    .from("attempts")
    .select("mcq_id, selected_index, correct, created_at")
    .in("mcq_id", ids)
    .order("created_at", { ascending: false });

  const latest = new Map<
    string,
    { selected_index: number; correct: boolean }
  >();
  for (const a of attempts ?? []) {
    if (!latest.has(a.mcq_id)) {
      latest.set(a.mcq_id, { selected_index: a.selected_index, correct: a.correct });
    }
  }

  // Feedback columns are revoked from client roles — read them with the service
  // role, only for questions already answered.
  const answeredIds = [...latest.keys()];
  const feedback = new Map<
    string,
    { explanation: string; choice_rationales: string[] | null; hint: string }
  >();
  if (answeredIds.length) {
    const admin = createAdminClient();
    const { data: rows } = await admin
      .from("mcqs")
      .select("id, explanation, choice_rationales, hint")
      .in("id", answeredIds);
    for (const r of rows ?? []) {
      feedback.set(r.id, {
        explanation: r.explanation,
        choice_rationales: r.choice_rationales,
        hint: r.hint,
      });
    }
  }

  return mcqs.map((m) => {
    const a = latest.get(m.id);
    const fb = feedback.get(m.id);
    return {
      id: m.id,
      objectiveId: m.objective_id,
      question: m.question,
      choices: m.choices as [string, string, string, string],
      orderIndex: m.order_index,
      review: a
        ? {
            selectedIndex: a.selected_index,
            correct: a.correct,
            explanation: a.correct ? (fb?.explanation ?? null) : null,
            choiceRationales: a.correct ? (fb?.choice_rationales ?? null) : null,
            hint: !a.correct ? (fb?.hint ?? null) : null,
          }
        : null,
    };
  });
}

export async function gradeMcq(
  mcqId: string,
  selectedIndex: number,
): Promise<GradeResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("grade_mcq", {
    p_mcq_id: mcqId,
    p_selected_index: selectedIndex,
  });
  if (error) throw new Error(error.message);

  const row = (Array.isArray(data) ? data[0] : data) as {
    correct: boolean;
    explanation: string | null;
    choice_rationales: string[] | null;
    hint: string | null;
  };
  return {
    correct: row.correct,
    explanation: row.explanation ?? null,
    choiceRationales: row.choice_rationales ?? null,
    hint: row.hint ?? null,
  };
}

export async function completeObjective(objectiveId: string): Promise<void> {
  const supabase = await createClient();

  const { data: obj } = await supabase
    .from("objectives")
    .select("id, lesson_id")
    .eq("id", objectiveId)
    .single();
  if (!obj) return;

  await supabase.from("objectives").update({ status: "done" }).eq("id", objectiveId);

  const { data: next } = await supabase
    .from("objectives")
    .select("id")
    .eq("lesson_id", obj.lesson_id)
    .eq("included", true)
    .eq("status", "upcoming")
    .order("order_index")
    .limit(1);

  if (next && next.length) {
    await supabase
      .from("objectives")
      .update({ status: "current" })
      .eq("id", next[0].id);
  } else {
    await supabase
      .from("lessons")
      .update({ status: "complete" })
      .eq("id", obj.lesson_id);
  }

  revalidatePath(`/lessons/${obj.lesson_id}`);
}
