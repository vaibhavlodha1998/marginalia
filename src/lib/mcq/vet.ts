import { authorMcqs } from "./author";
import { evaluateMcqs, type AggregatedVerdict } from "./evaluate";
import type { AuthoredMcq } from "@/lib/schemas/mcq";

export interface VettedMcq {
  mcq: AuthoredMcq;
  verdict: AggregatedVerdict;
}

// Keep only questions every evaluator passes; re-author the shortfall with the
// failures' issues as feedback, for a bounded number of rounds.
const MAX_ROUNDS = 2;

export async function authorVettedMcqs(input: {
  objective: string;
  section: string;
  source: string;
  count: number;
  figures?: { ref: number; caption: string; page: number | null }[];
}): Promise<VettedMcq[]> {
  const kept: VettedMcq[] = [];
  let best: VettedMcq | null = null;
  let notes: string[] = [];

  for (let round = 0; round < MAX_ROUNDS && kept.length < input.count; round++) {
    const need = input.count - kept.length;
    const batch = await authorMcqs({
      objective: input.objective,
      section: input.section,
      source: input.source,
      count: need,
      figures: input.figures,
      notes: round === 0 ? undefined : notes,
      avoid: kept.map((k) => k.mcq.question),
    });
    if (!batch || !batch.length) break;

    const verdicts = await evaluateMcqs(input.objective, input.source, batch);
    const roundIssues: string[] = [];
    batch.forEach((mcq, i) => {
      const verdict = verdicts[i];
      if (!verdict) return;
      if (verdict.passed) {
        kept.push({ mcq, verdict });
      } else {
        for (const e of verdict.evaluations) {
          if (!e.passed) roundIssues.push(...e.issues);
        }
        if (!best || verdict.score > best.verdict.score) best = { mcq, verdict };
      }
    });
    notes = [...new Set(roundIssues)].slice(0, 8);
  }

  // Never leave an objective empty: fall back to the best-scoring question.
  if (!kept.length && best) return [best];
  return kept.slice(0, input.count);
}
