"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/config/env";
import { glmJson } from "@/lib/ollama/json";
import { fastModel } from "@/lib/ollama/models";
import { deriveLessonMeta } from "@/lib/llm/title";
import { planSchema } from "@/lib/schemas/plan";
import { PLAN_SYSTEM } from "@/lib/plan/prompt";
import type { Difficulty } from "@/types/lesson";

const SYSTEM = `${PLAN_SYSTEM}

Return ONLY a JSON object, no prose, no code fences, of the form:
{ "sections": [
  { "title": "Section name", "objectives": [
    { "title": "...", "difficulty": "easy", "questionCount": 3 }
  ] }
] }`;

// Claim loser: wait for the winning draft's objectives to land.
async function waitForObjectives(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lessonId: string,
): Promise<number> {
  const deadline = Date.now() + 180_000;
  for (;;) {
    const { data } = await supabase
      .from("objectives")
      .select("id")
      .eq("lesson_id", lessonId);
    if (data && data.length) return data.length;
    if (Date.now() > deadline) return 0;
    await new Promise((r) => setTimeout(r, 1500));
  }
}

export async function generatePlan(lessonId: string): Promise<{ count: number }> {
  const supabase = await createClient();
  const model = serverEnv().FAST_MODEL;

  const { data: existing } = await supabase
    .from("objectives")
    .select("id")
    .eq("lesson_id", lessonId)
    .limit(1);
  if (existing && existing.length) return { count: existing.length };

  // One draft at a time; a concurrent caller waits for its result.
  const { data: won } = await supabase.rpc("claim_plan_gen", {
    p_lesson_id: lessonId,
    p_stale_seconds: 180,
  });
  if (!won) return { count: await waitForObjectives(supabase, lessonId) };

  const { data: pages } = await supabase
    .from("pdf_pages")
    .select("text")
    .eq("lesson_id", lessonId)
    .order("page_no");
  const allText = (pages ?? []).map((p) => p.text).join("\n\n");
  const titleText = allText.slice(0, 4000);
  const text = allText.slice(0, 45_000);

  // Title derivation and plan drafting run concurrently to cut latency.
  const [meta, plan] = await Promise.all([
    titleText.trim() ? deriveLessonMeta(titleText) : Promise.resolve(null),
    glmJson(SYSTEM, `Document:\n\n${text}`, planSchema, { model: fastModel() }),
  ]);
  if (meta) {
    await supabase
      .from("lessons")
      .update({ title: meta.title, subject: meta.subject })
      .eq("id", lessonId);
  }

  if (!plan) {
    await supabase.from("generations").insert({
      lesson_id: lessonId,
      kind: "plan",
      model,
      status: "error",
      error: "plan generation failed",
    });
    await supabase.from("lessons").update({ plan_gen_at: null }).eq("id", lessonId);
    return { count: 0 };
  }

  const flat = plan.sections.flatMap((s) =>
    s.objectives.map((o) => ({ section: s.title, ...o })),
  );

  const objectiveRows = flat.map((o, i) => ({
    lesson_id: lessonId,
    title: o.title,
    section: o.section,
    difficulty: o.difficulty,
    order_index: i,
    status: "upcoming" as const,
    included: true,
    planned_mcq_count: o.questionCount,
  }));

  const { error } = await supabase.from("objectives").insert(objectiveRows);
  if (error) throw new Error(error.message);

  await supabase.from("generations").insert({
    lesson_id: lessonId,
    kind: "plan",
    model,
    status: "ok",
    raw_output: plan,
  });

  revalidatePath(`/lessons/${lessonId}/plan`);
  return { count: objectiveRows.length };
}

export async function approvePlan(
  lessonId: string,
  edits: { id: string; difficulty: Difficulty; included: boolean }[],
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("approve_plan", {
    p_lesson_id: lessonId,
    p_edits: edits,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath(`/lessons/${lessonId}`);
  redirect(`/lessons/${lessonId}`);
}
