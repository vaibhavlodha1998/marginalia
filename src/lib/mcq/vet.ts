import { authorMcqs } from "./author";
import { evaluateMcqs, type AggregatedVerdict } from "./evaluate";
import type { AuthoredMcq } from "@/lib/schemas/mcq";

export interface VettedMcq {
  mcq: AuthoredMcq;
  verdict: AggregatedVerdict;
}

// Author one question and run it past the jury, up to a couple of rounds with
// the failures' issues fed back. Returns the passing question, plus the
// best-scoring attempt as a fallback so an objective is never empty.
const ROUNDS = 2;

export async function authorOneVetted(input: {
  objective: string;
  section: string;
  source: string;
  figures?: { ref: number; caption: string; page: number | null }[];
  avoid: string[];
}): Promise<{ vetted: VettedMcq | null; best: VettedMcq | null }> {
  let notes: string[] = [];
  let best: VettedMcq | null = null;

  for (let round = 0; round < ROUNDS; round++) {
    const batch = await authorMcqs({
      objective: input.objective,
      section: input.section,
      source: input.source,
      count: 1,
      figures: input.figures,
      notes: round === 0 ? undefined : notes,
      avoid: input.avoid,
    });
    if (!batch || !batch.length) continue;

    const [verdict] = await evaluateMcqs(input.objective, input.source, batch);
    const mcq = batch[0];
    if (!verdict) continue;
    if (verdict.passed) return { vetted: { mcq, verdict }, best };
    if (!best || verdict.score > best.verdict.score) best = { mcq, verdict };
    notes = [
      ...new Set(verdict.evaluations.flatMap((e) => (e.passed ? [] : e.issues))),
    ].slice(0, 8);
  }
  return { vetted: null, best };
}
