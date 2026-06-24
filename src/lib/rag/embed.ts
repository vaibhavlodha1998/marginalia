import { serverEnv } from "@/lib/config/env";

// Embeds text with a local Ollama embedding model. Returns one 768-dim vector
// per input. Cloud Ollama has no embedding models, so this targets EMBED_BASE_URL.
export async function embed(inputs: string[]): Promise<number[][]> {
  if (!inputs.length) return [];
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

export async function embedOne(input: string): Promise<number[]> {
  const [vec] = await embed([input]);
  return vec;
}

// pgvector text literal, e.g. "[0.1,0.2,...]"
export function toVector(v: number[]): string {
  return `[${v.join(",")}]`;
}
