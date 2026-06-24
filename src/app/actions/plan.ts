"use server";

import { createClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/config/env";
import { glmJson } from "@/lib/ollama/json";
import { planSchema } from "@/lib/schemas/plan";
import type { Difficulty } from "@/types/lesson";

const SYSTEM = `You are a tutor planning a lesson from a document.
Produce focused learning objectives, ordered foundational to advanced using the
prerequisite relationships, and assign each a difficulty.
Return ONLY a JSON object, no prose, no code fences, of the form:
{ "objectives": [
  { "title": "...", "difficulty": "easy", "conceptRefs": ["1","2"], "questionCount": 3 }
] }
Rules:
- difficulty is one of: easy, medium, hard.
- conceptRefs are the concept "ref" numbers this objective covers (may be empty).
- questionCount is a small integer (2-4).
- Order objectives easiest/foundational first, hardest last.
- Only use what the document supports.`;

export async function generatePlan(lessonId: string): Promise<{ count: number }> {
  const supabase = await createClient();
  const model = serverEnv().LLM_MODEL;

  const { data: existing } = await supabase
    .from("objectives")
    .select("id")
    .eq("lesson_id", lessonId)
    .limit(1);
  if (existing && existing.length) return { count: existing.length };

  const { data: concepts } = await supabase
    .from("concepts")
    .select("id, label, type")
    .eq("lesson_id", lessonId);

  let prompt: string;
  const refToId = new Map<string, string>();

  if (concepts && concepts.length) {
    const { data: edges } = await supabase
      .from("concept_edges")
      .select("from_id, to_id, type")
      .eq("lesson_id", lessonId);
    const idToRef = new Map<string, string>();
    concepts.forEach((c, i) => {
      const ref = String(i + 1);
      idToRef.set(c.id, ref);
      refToId.set(ref, c.id);
    });
    const conceptList = concepts
      .map((c, i) => `${i + 1}. [${c.type}] ${c.label}`)
      .join("\n");
    const edgeList = (edges ?? [])
      .map((e) => {
        const f = idToRef.get(e.from_id);
        const t = idToRef.get(e.to_id);
        return f && t ? `${f} ${e.type} ${t}` : null;
      })
      .filter(Boolean)
      .join("\n");
    prompt = `Concepts:\n${conceptList}\n\nRelationships:\n${edgeList || "(none)"}`;
  } else {
    const { data: pages } = await supabase
      .from("pdf_pages")
      .select("text")
      .eq("lesson_id", lessonId)
      .order("page_no");
    const text = (pages ?? [])
      .map((p) => p.text)
      .join("\n\n")
      .slice(0, 20_000);
    prompt = `Document:\n\n${text}`;
  }

  const plan = await glmJson(SYSTEM, prompt, planSchema);
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

  const objectiveRows = plan.objectives.map((o, i) => ({
    lesson_id: lessonId,
    title: o.title,
    difficulty: o.difficulty,
    order_index: i,
    status: "upcoming" as const,
    included: true,
    planned_mcq_count: o.questionCount,
  }));

  const { data: inserted, error } = await supabase
    .from("objectives")
    .insert(objectiveRows)
    .select("id");
  if (error) throw new Error(error.message);

  const links: { objective_id: string; concept_id: string }[] = [];
  plan.objectives.forEach((o, i) => {
    const objectiveId = inserted?.[i]?.id as string | undefined;
    if (!objectiveId) return;
    for (const ref of o.conceptRefs) {
      const conceptId = refToId.get(ref);
      if (conceptId) links.push({ objective_id: objectiveId, concept_id: conceptId });
    }
  });
  if (links.length) {
    await supabase.from("objective_concepts").insert(links);
  }

  await supabase.from("generations").insert({
    lesson_id: lessonId,
    kind: "plan",
    model,
    status: "ok",
    raw_output: plan,
  });

  return { count: objectiveRows.length };
}

export async function approvePlan(
  lessonId: string,
  edits: { id: string; difficulty: Difficulty; included: boolean }[],
): Promise<void> {
  const supabase = await createClient();

  let order = 0;
  for (const e of edits) {
    await supabase
      .from("objectives")
      .update({
        difficulty: e.difficulty,
        included: e.included,
        order_index: e.included ? order : 999,
        status: e.included && order === 0 ? "current" : "upcoming",
      })
      .eq("id", e.id);
    if (e.included) order += 1;
  }

  await supabase
    .from("lessons")
    .update({ status: "in_progress", plan_approved_at: new Date().toISOString() })
    .eq("id", lessonId);
}
