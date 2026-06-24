import { glmJson } from "@/lib/ollama/json";
import { reasoningModel } from "@/lib/ollama/models";
import { mcqSetSchema, type AuthoredMcq } from "@/lib/schemas/mcq";

const SYSTEM = `You write multiple-choice questions to assess one learning
objective, grounded ONLY in the provided source text. Never use outside facts.
Return ONLY a JSON object, no prose, no code fences, of the form:
{ "mcqs": [
  {
    "question": "...",
    "choices": ["A","B","C","D"],
    "correctIndex": 0,
    "explanation": "why the correct answer is correct, from the source",
    "choiceRationales": ["why A", "why B", "why C", "why D"],
    "hint": "a nudge toward the idea that does NOT reveal the answer"
  }
] }
Rules:
- Exactly 4 choices; correctIndex is 0-3; exactly one defensible correct answer.
- Distractors must be plausible but clearly wrong per the source.
- choiceRationales has exactly 4 entries, aligned to choices.
- The hint must not state or strongly imply the correct option.
- Ground every question, choice, explanation, and hint in the source text.`;

export async function authorMcqs(input: {
  objective: string;
  section: string;
  source: string;
  count: number;
  notes?: string[];
}): Promise<AuthoredMcq[] | null> {
  const revision = input.notes?.length
    ? `\n\nFix these issues from the previous attempt:\n- ${input.notes.join("\n- ")}`
    : "";
  const user = `Objective: ${input.objective}
Section: ${input.section}

Write exactly ${input.count} questions for this objective.${revision}

Source text:
${input.source}`;

  const res = await glmJson(SYSTEM, user, mcqSetSchema, {
    model: reasoningModel(),
  });
  return res?.mcqs ?? null;
}
