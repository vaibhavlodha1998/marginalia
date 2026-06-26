import { readFileSync } from "node:fs";
import { extractPdfText } from "@/lib/pdf/extract";
import { glmJson } from "@/lib/ollama/json";
import { reasoningModel } from "@/lib/ollama/models";
import { planSchema } from "@/lib/schemas/plan";
import { PLAN_SYSTEM } from "@/lib/plan/prompt";
import { authorMcqs } from "@/lib/mcq/author";
import { evaluateMcqs } from "@/lib/mcq/evaluate";

function loadEnv(file: string) {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    // optional
  }
}

const PLAN_JSON_SYSTEM = `${PLAN_SYSTEM}

Return ONLY a JSON object, no prose, no code fences, of the form:
{ "sections": [ { "title": "...", "objectives": [ { "title": "...", "difficulty": "easy", "questionCount": 3 } ] } ] }`;

const PDFS = ["example.pdf", "2606.24566v1.pdf"];

function done(label: string, start: number) {
  console.log(`   ${label}: ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

async function bench(pdf: string) {
  console.log(`\n=== ${pdf} ===`);

  let s = Date.now();
  const data = new Uint8Array(readFileSync(pdf));
  const { pages } = await extractPdfText(data);
  const allText = pages.join("\n\n");
  done(`extractPdfText [${pages.length} pages, ${allText.length} chars]`, s);

  s = Date.now();
  const plan = await glmJson(
    PLAN_JSON_SYSTEM,
    `Document:\n\n${allText.slice(0, 60_000)}`,
    planSchema,
    { model: reasoningModel() },
  );
  const objectives = plan?.sections.flatMap((sec) => sec.objectives) ?? [];
  done(`generatePlan [${objectives.length} objectives]`, s);

  const first = objectives[0];
  if (!first) return;
  const count = first.questionCount ?? 3;
  const source = allText.slice(0, 24_000);
  console.log(`   objective (${count} q): "${first.title.slice(0, 55)}"`);

  // Batch: author all questions in one call (full context, model varies them).
  s = Date.now();
  const mcqs = await authorMcqs({ objective: first.title, section: "", source, count });
  done(`batch author ${count} questions`, s);

  s = Date.now();
  const verdicts = await evaluateMcqs(first.title, source, mcqs ?? []);
  done(`jury`, s);
  console.log("   raw verdict[0]:", JSON.stringify(verdicts[0]));

  (mcqs ?? []).forEach((m, i) => {
    const v = verdicts[i];
    console.log(
      `   Q${i + 1} [${v?.passed ? "PASS" : "FAIL"} ${v?.score?.toFixed(2)}] ${m.question.slice(0, 70)}`,
    );
    for (const e of v?.evaluations ?? []) {
      if (!e.passed)
        console.log(`        x ${e.kind}: ${(e.issues[0] ?? "").slice(0, 90)}`);
    }
  });
}

async function main() {
  loadEnv(".env.local");
  for (const pdf of PDFS) await bench(pdf);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
