"use server";

import { createClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/config/env";
import { extractGraph } from "@/lib/graph/extract";
import { persistGraph } from "@/lib/graph/store";

const MAX_CHARS = 30_000;

export async function buildConceptGraph(
  lessonId: string,
): Promise<{ mode: "graph" | "text_fallback" }> {
  const supabase = await createClient();
  const model = serverEnv().LLM_MODEL;

  const { data: pages } = await supabase
    .from("pdf_pages")
    .select("page_no, text")
    .eq("lesson_id", lessonId)
    .order("page_no");

  const text = (pages ?? [])
    .map((p) => `[Page ${p.page_no}]\n${p.text}`)
    .join("\n\n")
    .slice(0, MAX_CHARS);

  let mode: "graph" | "text_fallback" = "text_fallback";

  try {
    const graph = text.trim() ? await extractGraph(text) : null;
    if (graph && graph.concepts.length) {
      await persistGraph(supabase, lessonId, graph, model);
      await supabase.from("generations").insert({
        lesson_id: lessonId,
        kind: "graph",
        model,
        status: "ok",
        raw_output: graph,
      });
      mode = "graph";
    } else {
      await supabase.from("generations").insert({
        lesson_id: lessonId,
        kind: "graph",
        model,
        status: "fallback",
        error: "no usable graph extracted",
      });
    }
  } catch (e) {
    await supabase.from("generations").insert({
      lesson_id: lessonId,
      kind: "graph",
      model,
      status: "error",
      error: e instanceof Error ? e.message : String(e),
    });
  }

  await supabase
    .from("lessons")
    .update({ extraction_mode: mode, status: "plan_pending" })
    .eq("id", lessonId);

  return { mode };
}
