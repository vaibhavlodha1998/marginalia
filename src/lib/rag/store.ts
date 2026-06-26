import type { SupabaseClient } from "@supabase/supabase-js";
import { chunkPages } from "./chunk";
import { embed, toVector } from "./embed";

const BATCH = 100; // Gemini batchEmbedContents max per request; fewer round-trips.

export async function buildLessonChunks(
  supabase: SupabaseClient,
  lessonId: string,
  pages: { pageNo: number; text: string }[],
): Promise<number> {
  // Fixed-size chunking embeds only the chunks; semantic chunking would embed
  // every sentence, which is infeasible for large documents.
  const chunks = chunkPages(pages);
  if (!chunks.length) return 0;

  // Insert per batch so a later rate-limit doesn't discard chunks already built.
  let inserted = 0;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const vectors = await embed(batch.map((c) => c.content));
    const rows = batch.map((c, j) => ({
      lesson_id: lessonId,
      content: c.content,
      page: c.page,
      order_index: c.orderIndex,
      embedding: toVector(vectors[j]),
    }));
    const { error } = await supabase.from("chunks").insert(rows);
    if (error) throw new Error(error.message);
    inserted += rows.length;
  }
  return inserted;
}
