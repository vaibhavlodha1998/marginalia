import type { SupabaseClient } from "@supabase/supabase-js";
import { chunkPages, type DocChunk } from "./chunk";
import { semanticChunkPages } from "./semantic";
import { embed, toVector } from "./embed";

const BATCH = 64;

export async function buildLessonChunks(
  supabase: SupabaseClient,
  lessonId: string,
  pages: { pageNo: number; text: string }[],
): Promise<number> {
  let chunks: DocChunk[];
  try {
    chunks = await semanticChunkPages(pages);
  } catch {
    chunks = chunkPages(pages);
  }
  if (!chunks.length) return 0;

  const rows: {
    lesson_id: string;
    content: string;
    page: number;
    order_index: number;
    embedding: string;
  }[] = [];

  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const vectors = await embed(batch.map((c) => c.content));
    batch.forEach((c, j) => {
      rows.push({
        lesson_id: lessonId,
        content: c.content,
        page: c.page,
        order_index: c.orderIndex,
        embedding: toVector(vectors[j]),
      });
    });
  }

  const { error } = await supabase.from("chunks").insert(rows);
  if (error) throw new Error(error.message);
  return rows.length;
}
