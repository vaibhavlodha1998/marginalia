import { glmJson } from "@/lib/ollama/json";
import { fastModel } from "@/lib/ollama/models";
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
- "explanation": a thorough, self-contained explanation (typically 4-7
  sentences) that fully teaches the concept. State why the correct answer is
  correct, the underlying principle or derivation behind it, and the intuition,
  so a learner who already answered correctly still gains a complete
  understanding. Define any key terms. Never say "the text states"; explain the
  concept itself. Use LaTeX for any math.
- "choiceRationales": exactly 4 entries aligned to choices; for each, give a
  full sentence or two on conceptually why it is right or, for distractors, the
  specific misconception that makes it wrong.
- "hints": an array of 2 to 4 progressively more helpful nudges, shown one at a
  time as the learner retries. The first is a gentle, conceptual pointer; each
  next one gives a little more guidance (a relevant principle, what to rule out,
  the reasoning step). NONE of them may reveal, name, or strongly imply the
  correct option. Order them from least to most revealing.
- "figureRef": if a provided figure is directly relevant, set this to that
  figure's number; otherwise null. At most one or two questions should use a
  figure, and only when it genuinely helps.
- "figurePlacement": when figureRef is set, where the figure belongs —
  "question" if it gives context the learner needs to answer, or "explanation"
  if showing it up-front would reveal or strongly hint the answer, or it is best
  understood only after answering. Default "question".

Return ONLY a JSON object, no prose, no code fences: { "mcqs": [ ... ] }`;

export async function authorMcqs(input: {
  objective: string;
  section: string;
  source: string;
  count: number;
  notes?: string[];
  avoid?: string[];
  figures?: { ref: number; caption: string; page: number | null }[];
}): Promise<AuthoredMcq[] | null> {
  const revision = input.notes?.length
    ? `\n\nFix these issues from the previous attempt:\n- ${input.notes.join("\n- ")}`
    : "";
  const avoid = input.avoid?.length
    ? `\n\nDo NOT repeat or closely paraphrase these existing questions:\n- ${input.avoid.join("\n- ")}`
    : "";
  const figures = input.figures?.length
    ? `\n\nAvailable figures (reference with figureRef only if directly relevant):\n${input.figures
        .map((f) => `${f.ref}. [page ${f.page ?? "?"}] ${f.caption}`)
        .join("\n")}`
    : "";
  const user = `Objective: ${input.objective}
Section: ${input.section}

Write exactly ${input.count} questions for this objective.${revision}${avoid}${figures}

Source text:
${input.source}`;

  const res = await glmJson(SYSTEM, user, mcqSetSchema, {
    model: fastModel(),
  });
  return res?.mcqs ?? null;
}
