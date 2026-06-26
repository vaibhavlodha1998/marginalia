"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/config/env";
import { logError } from "@/lib/log";
import { authorOneVetted, type VettedMcq } from "@/lib/mcq/vet";
import { embedOne, toVector } from "@/lib/rag/embed";
import type { GradeResult, McqPublic, ReviewMcq } from "@/types/lesson";

const SOURCE_CHARS = 30_000;
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 180_000;

// Claim loser: wait for the winning run's rows.
async function waitForMcqs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  objectiveId: string,
): Promise<number> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  for (;;) {
    const { data } = await supabase
      .from("mcqs")
      .select("id")
      .eq("objective_id", objectiveId);
    if (data && data.length) return data.length;

    const { data: obj } = await supabase
      .from("objectives")
      .select("mcq_gen_status")
      .eq("id", objectiveId)
      .single();
    if (obj?.mcq_gen_status === "error") return 0;
    if (Date.now() > deadline) return 0;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

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

  // Atomic claim so concurrent callers don't author a duplicate set.
  const { data: won } = await supabase.rpc("claim_objective_mcq_gen", {
    p_objective_id: objectiveId,
    p_stale_seconds: 300,
  });
  if (!won) return { count: await waitForMcqs(supabase, objectiveId) };

  // Writes via service role: the long run can outlive the user's token.
  const admin = createAdminClient();
  try {
    return await runGeneration(supabase, admin, obj, model, objectiveId);
  } catch (e) {
    // The lesson/objective may have been deleted mid-run; don't crash the caller.
    logError("quiz.generate_mcqs", e);
    await admin
      .from("objectives")
      .update({ mcq_gen_status: "error" })
      .eq("id", objectiveId);
    return { count: 0 };
  }
}

async function runGeneration(
  supabase: Awaited<ReturnType<typeof createClient>>,
  admin: ReturnType<typeof createAdminClient>,
  obj: { id: string; lesson_id: string; title: string; section: string | null; planned_mcq_count: number | null },
  model: string,
  objectiveId: string,
): Promise<{ count: number }> {

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
  } catch (e) {
    logError("quiz.rag_retrieve", e);
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

  const { data: figRows } = await supabase
    .from("figures")
    .select("id, caption, page")
    .eq("lesson_id", obj.lesson_id)
    .order("page");
  const figures = (figRows ?? []).map((f, i) => ({
    id: f.id as string,
    ref: i + 1,
    caption: (f.caption as string | null) ?? "figure",
    page: f.page as number | null,
  }));

  // Incremental: author and vet one question at a time, inserting each as soon
  // as it passes so the quiz can reveal it while the rest are still generating.
  const asked: string[] = [];
  const candidates: VettedMcq[] = [];
  let order = 0;

  const insertOne = async (v: VettedMcq, orderIndex: number): Promise<void> => {
    const m = v.mcq;
    const { data: ins } = await admin
      .from("mcqs")
      .insert({
        objective_id: objectiveId,
        figure_id:
          m.figureRef && figures[m.figureRef - 1]
            ? figures[m.figureRef - 1].id
            : null,
        question: m.question,
        choices: m.choices,
        correct_index: m.correctIndex,
        explanation: m.explanation,
        choice_rationales: m.choiceRationales,
        hint: m.hints[0],
        hints: m.hints,
        figure_placement: m.figureRef ? m.figurePlacement : "question",
        grounded:
          v.verdict.evaluations.find((e) => e.kind === "grounding")?.passed ?? false,
        model,
        validation_status: "valid",
        eval_status: v.verdict.passed ? "passed" : "failed",
        eval_score: v.verdict.score,
        eval_runs: 1,
        order_index: orderIndex,
      })
      .select("id")
      .single();
    if (!ins) throw new Error("mcq insert failed");

    const evalRows = v.verdict.evaluations.map((e) => ({
      mcq_id: ins.id,
      evaluator: e.kind,
      passed: e.passed,
      score: e.score,
      issues: e.issues,
      model: serverEnv().EVAL_MODEL,
      run: 1,
    }));
    if (evalRows.length) await admin.from("mcq_evaluations").insert(evalRows);
    asked.push(m.question);
    revalidatePath(`/lessons/${obj.lesson_id}`);
  };

  const figs = figures.map(({ ref, caption, page }) => ({ ref, caption, page }));
  let attempts = 0;
  while (order < count && attempts < count + 2) {
    attempts++;
    const { vetted, best } = await authorOneVetted({
      objective: obj.title,
      section: obj.section ?? "",
      source,
      figures: figs,
      avoid: asked,
    });
    if (vetted) {
      await insertOne(vetted, order);
      order++;
    } else if (best) {
      candidates.push(best);
    }
  }

  // Fill any remaining slots so the question count matches the plan, using the
  // best-scoring attempts we already authored (no extra model calls).
  if (order < count && candidates.length) {
    candidates.sort((a, b) => b.verdict.score - a.verdict.score);
    for (const cand of candidates) {
      if (order >= count) break;
      await insertOne(cand, order);
      order++;
    }
  }

  if (order === 0) {
    await admin.from("generations").insert({
      lesson_id: obj.lesson_id,
      kind: "mcqs",
      model,
      status: "error",
      error: "author produced no questions",
    });
    await admin
      .from("objectives")
      .update({ mcq_gen_status: "error" })
      .eq("id", objectiveId);
    return { count: 0 };
  }

  await admin.from("generations").insert({
    lesson_id: obj.lesson_id,
    kind: "mcqs",
    model,
    status: "ok",
  });

  // Reconcile the planned count to what actually passed the jury.
  await admin
    .from("objectives")
    .update({ mcq_gen_status: "ready", planned_mcq_count: order })
    .eq("id", objectiveId);

  revalidatePath(`/lessons/${obj.lesson_id}`);
  return { count: order };
}

// Lightweight poll target: is generation for this objective still running?
export async function getObjectiveGenStatus(
  objectiveId: string,
): Promise<{ status: string | null }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("objectives")
    .select("mcq_gen_status")
    .eq("id", objectiveId)
    .single();
  return { status: (data?.mcq_gen_status as string | null) ?? null };
}

async function figureUrlMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  figureIds: (string | null)[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(figureIds.filter((x): x is string => !!x))];
  if (!unique.length) return map;
  const { data: figs } = await supabase
    .from("figures")
    .select("id, storage_path")
    .in("id", unique);
  for (const f of figs ?? []) {
    const { data: signed } = await supabase.storage
      .from("figures")
      .createSignedUrl(f.storage_path, 3600);
    if (signed?.signedUrl) map.set(f.id, signed.signedUrl);
  }
  return map;
}

export async function getObjectiveMcqs(
  objectiveId: string,
): Promise<McqPublic[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mcqs")
    .select("id, objective_id, question, choices, order_index, figure_id, figure_placement")
    .eq("objective_id", objectiveId)
    .order("order_index");
  if (error) throw new Error(error.message);

  const urls = await figureUrlMap(supabase, (data ?? []).map((m) => m.figure_id));

  return (data ?? []).map((m) => ({
    id: m.id,
    objectiveId: m.objective_id,
    question: m.question,
    choices: m.choices as [string, string, string, string],
    orderIndex: m.order_index,
    figureUrl: m.figure_id ? (urls.get(m.figure_id) ?? null) : null,
    figurePlacement: (m.figure_placement as "question" | "explanation") ?? "question",
  }));
}

export async function getObjectiveReview(
  objectiveId: string,
): Promise<ReviewMcq[]> {
  const supabase = await createClient();

  const { data: mcqs } = await supabase
    .from("mcqs")
    .select("id, objective_id, question, choices, order_index, figure_id, figure_placement")
    .eq("objective_id", objectiveId)
    .order("order_index");
  if (!mcqs || !mcqs.length) return [];

  const ids = mcqs.map((m) => m.id);
  const urls = await figureUrlMap(supabase, mcqs.map((m) => m.figure_id));

  // Latest attempt per MCQ for the current user.
  const { data: attempts } = await supabase
    .from("attempts")
    .select("mcq_id, selected_index, correct, attempt_count, created_at")
    .in("mcq_id", ids)
    .order("created_at", { ascending: false });

  const latest = new Map<
    string,
    { selected_index: number; correct: boolean; attempt_count: number }
  >();
  for (const a of attempts ?? []) {
    if (!latest.has(a.mcq_id)) {
      latest.set(a.mcq_id, {
        selected_index: a.selected_index,
        correct: a.correct,
        attempt_count: a.attempt_count,
      });
    }
  }

  // Feedback columns are revoked from client roles — read them with the service
  // role, only for questions already answered.
  const answeredIds = [...latest.keys()];
  const feedback = new Map<
    string,
    {
      explanation: string;
      choice_rationales: string[] | null;
      hint: string;
      hints: string[] | null;
    }
  >();
  if (answeredIds.length) {
    const admin = createAdminClient();
    const { data: rows } = await admin
      .from("mcqs")
      .select("id, explanation, choice_rationales, hint, hints")
      .in("id", answeredIds);
    for (const r of rows ?? []) {
      feedback.set(r.id, {
        explanation: r.explanation,
        choice_rationales: r.choice_rationales,
        hint: r.hint,
        hints: r.hints as string[] | null,
      });
    }
  }

  // Hint the learner last saw, by wrong-attempt number, capped at the last.
  function reviewHint(
    fb: { hint: string; hints: string[] | null } | undefined,
    attemptCount: number,
  ): string | null {
    if (!fb) return null;
    if (fb.hints && fb.hints.length) {
      return fb.hints[Math.min(attemptCount, fb.hints.length) - 1];
    }
    return fb.hint ?? null;
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
      figureUrl: m.figure_id ? (urls.get(m.figure_id) ?? null) : null,
      figurePlacement: (m.figure_placement as "question" | "explanation") ?? "question",
      review: a
        ? {
            selectedIndex: a.selected_index,
            correct: a.correct,
            explanation: a.correct ? (fb?.explanation ?? null) : null,
            choiceRationales: a.correct ? (fb?.choice_rationales ?? null) : null,
            hint: !a.correct ? reviewHint(fb, a.attempt_count) : null,
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
