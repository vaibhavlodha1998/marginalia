import { glmJson } from "@/lib/ollama/json";
import { evalModel } from "@/lib/ollama/models";
import {
  evaluatorKinds,
  verdictSetSchema,
  type AuthoredMcq,
  type EvaluatorKind,
} from "@/lib/schemas/mcq";

const RUBRICS: Record<EvaluatorKind, string> = {
  grounding:
    "Check each question is fully supported by the source text. Fail any where a question, choice, explanation, or hint uses facts not in the source (hallucination).",
  correctness:
    "Check the marked correctIndex is the single correct answer per the source, and every distractor is actually wrong. Fail if the key is wrong or a distractor is also correct.",
  unambiguous:
    "Check there is exactly one defensible answer and the wording is unambiguous. Fail if multiple options could be correct or the question is vague.",
  quality:
    "Check the question is a clear, self-contained, non-trivial exam question on-topic for the objective, and NONE of the hints reveal the answer. Fail if it references 'the text/passage/author/document/preface' or 'according to ...', quotes the source verbatim, is trivial, off-topic, or any hint spoils the answer.",
};

const SYSTEM = "You are a strict exam-question reviewer. Return ONLY JSON.";

export interface McqEvaluation {
  kind: EvaluatorKind;
  passed: boolean;
  score: number;
  issues: string[];
}

export interface AggregatedVerdict {
  passed: boolean;
  score: number;
  evaluations: McqEvaluation[];
}

function buildPrompt(
  kind: EvaluatorKind,
  objective: string,
  source: string,
  mcqs: AuthoredMcq[],
) {
  const list = mcqs.map((m, i) => `#${i + 1} ${JSON.stringify(m)}`).join("\n");
  return `Objective: ${objective}

Source text:
${source}

${RUBRICS[kind]}
Return ONLY JSON: { "verdicts": [ { "passed": true, "score": 0.0, "issues": [] } ] }
with exactly ${mcqs.length} verdicts, in the same order as the MCQs.

MCQs:
${list}`;
}

export async function evaluateMcqs(
  objective: string,
  source: string,
  mcqs: AuthoredMcq[],
): Promise<AggregatedVerdict[]> {
  const quorum = (process.env.EVAL_QUORUM ?? "all").toLowerCase();
  const threshold = Number.parseFloat(process.env.EVAL_PASS_THRESHOLD ?? "0.7") || 0.7;

  const results = await Promise.all(
    evaluatorKinds.map(async (kind) => {
      const v = await glmJson(SYSTEM, buildPrompt(kind, objective, source, mcqs), verdictSetSchema, {
        model: evalModel(),
      });
      return { kind, verdicts: v?.verdicts ?? [] };
    }),
  );

  return mcqs.map((_, i) => {
    const evaluations: McqEvaluation[] = results.map((r) => {
      const verdict = r.verdicts[i] ?? { passed: false, score: 0, issues: ["no verdict"] };
      return { kind: r.kind, passed: verdict.passed, score: verdict.score, issues: verdict.issues };
    });
    const passes = evaluations.filter((e) => e.passed).length;
    const avg = evaluations.reduce((s, e) => s + e.score, 0) / (evaluations.length || 1);
    const quorumOk =
      quorum === "majority" ? passes > evaluations.length / 2 : passes === evaluations.length;
    return { passed: quorumOk && avg >= threshold, score: avg, evaluations };
  });
}
