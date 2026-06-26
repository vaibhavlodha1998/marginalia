import { authorMcqs } from "./author";
import { evaluateMcqs, type AggregatedVerdict } from "./evaluate";
import type { AuthoredMcq } from "@/lib/schemas/mcq";

export interface VettedMcq {
  mcq: AuthoredMcq;
  verdict: AggregatedVerdict;
}

// Author all questions in one call (the model varies them across the full
// context), jury them once, keep the passing ones, and fill any shortfall with
// the best-scoring of the rest so the count matches the plan.
export async function authorVettedMcqs(input: {
  objective: string;
  section: string;
  source: string;
  count: number;
  figures?: { ref: number; caption: string; page: number | null }[];
}): Promise<VettedMcq[]> {
  const mcqs = await authorMcqs({
    objective: input.objective,
    section: input.section,
    source: input.source,
    count: input.count,
    figures: input.figures,
  });
  if (!mcqs || !mcqs.length) return [];

  const verdicts = await evaluateMcqs(input.objective, input.source, mcqs);
  const paired: VettedMcq[] = mcqs.map((mcq, i) => ({
    mcq,
    verdict: verdicts[i] ?? { passed: false, score: 0, evaluations: [] },
  }));

  const passing = paired.filter((p) => p.verdict.passed);
  if (passing.length >= input.count) return passing.slice(0, input.count);

  // Fill the shortfall with the best-scoring failures so the count matches the plan.
  const failing = paired
    .filter((p) => !p.verdict.passed)
    .sort((a, b) => b.verdict.score - a.verdict.score);
  return [...passing, ...failing].slice(0, input.count);
}
