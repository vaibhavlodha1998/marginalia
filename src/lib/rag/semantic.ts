import { embed } from "./embed";
import type { DocChunk } from "./chunk";

// Kept for reference but NOT wired up: this embeds every sentence to find topic
// boundaries, which is too many embedding calls (cost and provider rate limits)
// on large documents. buildLessonChunks uses the fixed-size chunkPages instead.
// Swap back in if a cheaper or local embedding endpoint makes it affordable.

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-Z(\[])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

// Group consecutive sentences into chunks, starting a new chunk when the
// similarity between neighbouring sentences drops (a topic shift) or the chunk
// reaches the size cap. Page-scoped so each chunk keeps a source page.
export async function semanticChunkPages(
  pages: { pageNo: number; text: string }[],
  opts: { maxChars?: number; minChars?: number; threshold?: number } = {},
): Promise<DocChunk[]> {
  const maxChars = opts.maxChars ?? 1400;
  const minChars = opts.minChars ?? 300;
  const threshold = opts.threshold ?? 0.5;

  const out: DocChunk[] = [];
  let order = 0;

  for (const p of pages) {
    const sentences = splitSentences(p.text);
    if (!sentences.length) continue;
    if (sentences.length === 1) {
      out.push({ content: sentences[0], page: p.pageNo, orderIndex: order++ });
      continue;
    }

    const vecs = await embed(sentences);
    let cur = [sentences[0]];
    let curLen = sentences[0].length;

    for (let i = 1; i < sentences.length; i++) {
      const sim = cosine(vecs[i - 1], vecs[i]);
      const tooBig = curLen + sentences[i].length + 1 > maxChars;
      if ((sim < threshold && curLen >= minChars) || tooBig) {
        out.push({ content: cur.join(" "), page: p.pageNo, orderIndex: order++ });
        cur = [sentences[i]];
        curLen = sentences[i].length;
      } else {
        cur.push(sentences[i]);
        curLen += sentences[i].length + 1;
      }
    }
    if (cur.length) {
      out.push({ content: cur.join(" "), page: p.pageNo, orderIndex: order++ });
    }
  }
  return out;
}
