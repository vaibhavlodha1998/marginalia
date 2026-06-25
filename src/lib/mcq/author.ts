import { glmJson } from "@/lib/ollama/json";
import { reasoningModel } from "@/lib/ollama/models";
import { mcqSetSchema, type AuthoredMcq } from "@/lib/schemas/mcq";

const SYSTEM = `You write rigorous multiple-choice questions to assess one
learning objective. Use ONLY knowledge supported by the provided source text —
never outside facts — but write like a real exam, not a reading comprehension
quiz.

Question style:
- Each question must be SELF-CONTAINED and test understanding of the subject
  matter directly. Do NOT reference "the text", "the passage", "the document",
  "the author", "the preface", "the source", or "according to ...". Ask about
  the concept itself.
- Do NOT quote the source verbatim. Phrase everything in your own words.
- Write any mathematics in LaTeX: inline as $...$ and display as $$...$$
  (e.g. $\\mathbb{R}^n$, $M_{m\\times n}$, $\\sum_{i=1}^{n} a_i v_i$).

Each MCQ object:
- "question": the question (LaTeX for any math).
- "choices": exactly 4 options (LaTeX for any math).
- "correctIndex": 0-3; exactly one defensible correct answer.
- "explanation": a DETAILED explanation (2-4 sentences) of WHY the correct
  answer is correct, teaching the underlying idea in your own words. Never say
  "the text states"; explain the concept itself.
- "choiceRationales": exactly 4 entries aligned to choices; for each, say
  conceptually why it is right or wrong.
- "hint": a nudge toward the idea that does NOT reveal or strongly imply the
  correct option.

Return ONLY a JSON object, no prose, no code fences: { "mcqs": [ ... ] }`;

export async function authorMcqs(input: {
  objective: string;
  section: string;
  source: string;
  count: number;
  notes?: string[];
  avoid?: string[];
}): Promise<AuthoredMcq[] | null> {
  const revision = input.notes?.length
    ? `\n\nFix these issues from the previous attempt:\n- ${input.notes.join("\n- ")}`
    : "";
  const avoid = input.avoid?.length
    ? `\n\nDo NOT repeat or closely paraphrase these existing questions:\n- ${input.avoid.join("\n- ")}`
    : "";
  const user = `Objective: ${input.objective}
Section: ${input.section}

Write exactly ${input.count} questions for this objective.${revision}${avoid}

Source text:
${input.source}`;

  const res = await glmJson(SYSTEM, user, mcqSetSchema, {
    model: reasoningModel(),
  });
  return res?.mcqs ?? null;
}
