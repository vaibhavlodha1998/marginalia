"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/config/env";
import { glmJson } from "@/lib/ollama/json";
import { fastModel } from "@/lib/ollama/models";
import { summarySchema } from "@/lib/schemas/summary";

export interface SummaryResult {
  overallScore: number;
  firstTryAccuracy: number;
  note: string;
  tips: string[];
}

const SYSTEM = `You are a warm tutor writing a short end-of-lesson note and study
tips for a learner, based on their per-objective results.
Return ONLY JSON: { "note": "...", "tips": ["...", "..."] }.
- "note": 2-3 encouraging sentences on how they did — name a strength and gently
  flag the densest/weakest area. A wrong answer is "took a couple of tries", not
  a failure.
- "tips": 2-4 specific, actionable study tips focused on the objectives they
  struggled with (lower scores or more retries). Tie each tip to that topic.
- Use LaTeX ($...$) for any math. Keep it concrete and kind.`;

export async function generateSummary(
  lessonId: string,
): Promise<SummaryResult> {
  const supabase = await createClient();

  // Ownership gate before any service-role write.
  const { data: owned } = await supabase
    .from("lessons")
    .select("id")
    .eq("id", lessonId)
    .maybeSingle();
  if (!owned) throw new Error("Lesson not found");

  const { data: existing } = await supabase
    .from("lesson_summaries")
    .select("overall_score, first_try_accuracy, report, study_tips")
    .eq("lesson_id", lessonId)
    .maybeSingle();
  if (existing) {
    return {
      overallScore: Number(existing.overall_score ?? 0),
      firstTryAccuracy: Number(existing.first_try_accuracy ?? 0),
      note: existing.report ?? "",
      tips: (existing.study_tips as string[] | null) ?? [],
    };
  }

  const { data: objs } = await supabase
    .from("objectives")
    .select("id, title, planned_mcq_count")
    .eq("lesson_id", lessonId)
    .eq("included", true)
    .order("order_index");

  const { data: prog } = await supabase
    .from("objective_progress")
    .select("objective_id, total_mcqs, correct_mcqs, first_try_correct")
    .eq("lesson_id", lessonId);

  let totalQ = 0;
  let correctQ = 0;
  let firstTryQ = 0;
  const perObjective = (objs ?? []).map((o) => {
    const p = (prog ?? []).find((x) => x.objective_id === o.id);
    const total = o.planned_mcq_count ?? p?.total_mcqs ?? 0;
    const correct = p?.correct_mcqs ?? 0;
    const firstTry = p?.first_try_correct ?? 0;
    totalQ += total;
    correctQ += correct;
    firstTryQ += firstTry;
    return { title: o.title, correct, total, firstTry };
  });

  const overallScore = totalQ ? Math.round((correctQ / totalQ) * 100) : 0;
  const firstTryAccuracy = totalQ ? Math.round((firstTryQ / totalQ) * 100) : 0;

  const results = perObjective
    .map(
      (o) =>
        `- ${o.title}: ${o.correct}/${o.total} correct, ${o.firstTry}/${o.total} on the first try`,
    )
    .join("\n");

  const summary = await glmJson(
    SYSTEM,
    `Overall score: ${overallScore}%\n\nPer-objective results:\n${results}`,
    summarySchema,
    { model: fastModel() },
  );

  const note =
    summary?.note ?? "Nicely done — you worked through every objective.";
  const tips = summary?.tips ?? [];

  const admin = createAdminClient();
  await admin.from("lesson_summaries").insert({
    lesson_id: lessonId,
    overall_score: overallScore,
    first_try_accuracy: firstTryAccuracy,
    report: note,
    study_tips: tips,
    model: serverEnv().FAST_MODEL,
  });

  return { overallScore, firstTryAccuracy, note, tips };
}
