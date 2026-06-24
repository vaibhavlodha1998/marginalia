"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/config/env";
import { authorMcqs } from "@/lib/mcq/author";
import { evaluateMcqs } from "@/lib/mcq/evaluate";
import type { GradeResult, McqPublic } from "@/types/lesson";

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

  const { data: pages } = await supabase
    .from("pdf_pages")
    .select("text")
    .eq("lesson_id", obj.lesson_id)
    .order("page_no");
  const source = (pages ?? [])
    .map((p) => p.text)
    .join("\n\n")
    .slice(0, SOURCE_CHARS);
  const count = obj.planned_mcq_count ?? 3;

  let mcqs = await authorMcqs({
    objective: obj.title,
    section: obj.section ?? "",
    source,
    count,
  });
  if (!mcqs || !mcqs.length) {
    await supabase.from("generations").insert({
      lesson_id: obj.lesson_id,
      kind: "mcqs",
      model,
      status: "error",
      error: "author produced no questions",
    });
    return { count: 0 };
  }

  let verdicts = await evaluateMcqs(obj.title, source, mcqs);

  // One revision pass if the jury rejected everything.
  let runs = 1;
  if (!verdicts.some((v) => v.passed)) {
    const issues = verdicts
      .flatMap((v) => v.evaluations.flatMap((e) => e.issues))
      .slice(0, 6);
    const revised = await authorMcqs({
      objective: obj.title,
      section: obj.section ?? "",
      source,
      count,
      notes: issues,
    });
    if (revised && revised.length) {
      const revisedVerdicts = await evaluateMcqs(obj.title, source, revised);
      runs = 2;
      if (
        revisedVerdicts.filter((v) => v.passed).length >=
        verdicts.filter((v) => v.passed).length
      ) {
        mcqs = revised;
        verdicts = revisedVerdicts;
      }
    }
  }

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

  const { data: inserted, error } = await supabase
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
  if (evalRows.length) await supabase.from("mcq_evaluations").insert(evalRows);

  await supabase.from("generations").insert({
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
