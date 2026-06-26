import { serverEnv } from "@/lib/config/env";

// One 768-dim vector per input. Routes to Gemini when GOOGLE_API_KEY is set
// (works on serverless), otherwise a local Ollama model via EMBED_BASE_URL.
export async function embed(inputs: string[]): Promise<number[][]> {
  if (!inputs.length) return [];
  const { GOOGLE_API_KEY } = serverEnv();
  if (GOOGLE_API_KEY) return embedGemini(inputs, GOOGLE_API_KEY);

  const { EMBED_BASE_URL, EMBED_MODEL } = serverEnv();
  const res = await fetch(`${EMBED_BASE_URL.replace(/\/$/, "")}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: inputs }),
  });
  if (!res.ok) {
    throw new Error(`embed failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { embeddings?: number[][] };
  if (!json.embeddings?.length) throw new Error("embed returned no vectors");
  return json.embeddings;
}

async function embedGemini(inputs: string[], apiKey: string): Promise<number[][]> {
  const model = serverEnv().GEMINI_EMBED_MODEL;
  const out: number[][] = [];
  for (let i = 0; i < inputs.length; i += 100) {
    const batch = inputs.slice(i, i + 100);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents`,
      {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: batch.map((text) => ({
            model: `models/${model}`,
            content: { parts: [{ text }] },
            outputDimensionality: 768,
          })),
        }),
      },
    );
    if (!res.ok) {
      throw new Error(`gemini embed failed: ${res.status} ${await res.text()}`);
    }
    const json = (await res.json()) as { embeddings?: { values: number[] }[] };
    if (!json.embeddings?.length) throw new Error("gemini embed returned no vectors");
    out.push(...json.embeddings.map((e) => e.values));
  }
  return out;
}

export async function embedOne(input: string): Promise<number[]> {
  const [vec] = await embed([input]);
  return vec;
}

// pgvector text literal, e.g. "[0.1,0.2,...]"
export function toVector(v: number[]): string {
  return `[${v.join(",")}]`;
}
