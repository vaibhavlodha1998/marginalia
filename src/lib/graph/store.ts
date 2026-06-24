import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConceptGraph } from "@/lib/schemas/ontology";

export async function persistGraph(
  supabase: SupabaseClient,
  lessonId: string,
  graph: ConceptGraph,
  model: string,
): Promise<{ concepts: number; edges: number }> {
  const conceptRows = graph.concepts.map((c) => ({
    lesson_id: lessonId,
    type: c.type,
    label: c.label,
    body: c.body ?? "",
    source_page: c.page ?? null,
    model,
    validation_status: "valid" as const,
  }));

  const { data: inserted, error } = await supabase
    .from("concepts")
    .insert(conceptRows)
    .select("id");
  if (error) throw new Error(error.message);

  // Bulk insert returns rows in the order they were supplied, so map by index.
  const keyToId = new Map<string, string>();
  graph.concepts.forEach((c, i) => {
    const id = inserted?.[i]?.id as string | undefined;
    if (id) keyToId.set(c.key, id);
  });

  const seen = new Set<string>();
  const edgeRows = graph.edges
    .map((e) => ({ from_id: keyToId.get(e.from), to_id: keyToId.get(e.to), type: e.type }))
    .filter((e): e is { from_id: string; to_id: string; type: ConceptGraph["edges"][number]["type"] } => {
      if (!e.from_id || !e.to_id || e.from_id === e.to_id) return false;
      const sig = `${e.from_id}|${e.to_id}|${e.type}`;
      if (seen.has(sig)) return false;
      seen.add(sig);
      return true;
    })
    .map((e) => ({ ...e, lesson_id: lessonId }));

  if (edgeRows.length) {
    const { error: edgeErr } = await supabase.from("concept_edges").insert(edgeRows);
    if (edgeErr) throw new Error(edgeErr.message);
  }

  return { concepts: conceptRows.length, edges: edgeRows.length };
}
