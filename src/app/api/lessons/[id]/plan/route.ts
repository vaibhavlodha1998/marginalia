import { streamObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/config/env";
import { ollamaProvider } from "@/lib/ai/ollama";
import { planSchema } from "@/lib/schemas/plan";
import { PLAN_SYSTEM } from "@/lib/plan/prompt";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: pages } = await supabase
    .from("pdf_pages")
    .select("page_no, text")
    .eq("lesson_id", id)
    .order("page_no");

  const text = (pages ?? [])
    .map((p) => `[Page ${p.page_no}]\n${p.text}`)
    .join("\n\n")
    .slice(0, 60_000);

  const ollama = ollamaProvider();
  const result = streamObject({
    model: ollama(serverEnv().LLM_MODEL),
    schema: planSchema,
    system: PLAN_SYSTEM,
    prompt: `Document:\n\n${text}`,
  });

  return result.toTextStreamResponse();
}
