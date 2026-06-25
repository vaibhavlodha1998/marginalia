"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/config/env";
import { glmJson } from "@/lib/ollama/json";
import { fastModel } from "@/lib/ollama/models";
import { deriveLessonMeta } from "@/lib/llm/title";
import { planSchema, type Plan } from "@/lib/schemas/plan";
import { PLAN_SYSTEM } from "@/lib/plan/prompt";
import type { Difficulty } from "@/types/lesson";

const SYSTEM = `${PLAN_SYSTEM}

Return ONLY a JSON object, no prose, no code fences, of the form:
{ "sections": [
  { "title": "Section name", "objectives": [
    { "title": "...", "difficulty": "easy", "conceptRefs": ["1","2"], "questionCount": 3 }
  ] }
] }`;

async function setTitleFromDocument(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lessonId: string,
) {
  const { data: pages } = await supabase
    .from("pdf_pages")
    .select("text")
    .eq("lesson_id", lessonId)
    .order("page_no")
    .limit(3);
  const text = (pages ?? [])
    .map((p) => p.text)
    .join("\n\n")
    .slice(0, 4000);
  const meta = text.trim() ? await deriveLessonMeta(text) : null;
  if (meta) {
    await supabase
      .from("lessons")
      .update({ title: meta.title, subject: meta.subject })
      .eq("id", lessonId);
  }
}

// Persist a streamed plan (from the AI SDK route), then move into the editable
// review. Used by the streaming flow; generatePlan() is the non-streaming path.
export async function savePlan(lessonId: string, plan: unknown): Promise<void> {
  const supabase = await createClient();
  const model = serverEnv().FAST_MODEL;

  const { data: existing } = await supabase
    .from("objectives")
    .select("id")
    .eq("lesson_id", lessonId)
    .limit(1);
  if (existing && existing.length) {
    revalidatePath(`/lessons/${lessonId}/plan`);
    return;
  }

  const parsed = planSchema.safeParse(plan);
  if (!parsed.success) throw new Error("invalid streamed plan");

  await setTitleFromDocument(supabase, lessonId);
  await persistPlan(supabase, lessonId, parsed.data, model);
  revalidatePath(`/lessons/${lessonId}/plan`);
}

async function persistPlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lessonId: string,
  plan: Plan,
  model: string,
) {
  const flat = plan.sections.flatMap((s) =>
    s.objectives.map((o) => ({ section: s.title, ...o })),
  );
  const rows = flat.map((o, i) => ({
    lesson_id: lessonId,
    title: o.title,
    section: o.section,
    difficulty: o.difficulty,
    order_index: i,
    status: "upcoming" as const,
    included: true,
    planned_mcq_count: o.questionCount,
  }));
  const { error } = await supabase.from("objectives").insert(rows);
  if (error) throw new Error(error.message);

  await supabase.from("generations").insert({
    lesson_id: lessonId,
    kind: "plan",
    model,
    status: "ok",
    raw_output: plan,
  });
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

  const { data: titlePages } = await supabase
    .from("pdf_pages")
    .select("text")
    .eq("lesson_id", lessonId)
    .order("page_no")
    .limit(3);
  const titleText = (titlePages ?? [])
    .map((p) => p.text)
    .join("\n\n")
    .slice(0, 4000);
  const meta = titleText.trim() ? await deriveLessonMeta(titleText) : null;
  if (meta) {
    await supabase
      .from("lessons")
      .update({ title: meta.title, subject: meta.subject })
      .eq("id", lessonId);
  }

  const { data: pages } = await supabase
    .from("pdf_pages")
    .select("text")
    .eq("lesson_id", lessonId)
    .order("page_no");
  const text = (pages ?? [])
    .map((p) => p.text)
    .join("\n\n")
    .slice(0, 45_000);
  const prompt = `Document:\n\n${text}`;

  const plan = await glmJson(SYSTEM, prompt, planSchema, { model: fastModel() });
  if (!plan) {
    await supabase.from("generations").insert({
      lesson_id: lessonId,
      kind: "plan",
      model,
      status: "error",
      error: "plan generation failed",
    });
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
