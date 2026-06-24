import { streamText, type ModelMessage } from "ai";
import { createClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/config/env";
import { ollamaProvider } from "@/lib/ai/ollama";
import { embedOne, toVector } from "@/lib/rag/embed";

const LETTERS = ["A", "B", "C", "D"];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json()) as {
    messages: ModelMessage[];
    question?: string;
    choices?: string[];
    objectiveTitle?: string;
  };

  const supabase = await createClient();

  let context = "";
  if (body.question) {
    try {
      const vec = await embedOne(body.question);
      const { data } = await supabase.rpc("match_chunks", {
        p_lesson_id: id,
        p_query: toVector(vec),
        p_limit: 8,
      });
      if (data?.length) {
        context = (data as { content: string }[])
          .map((c) => c.content)
          .join("\n\n");
      }
    } catch {
      // grounding optional
    }
  }

  const options = (body.choices ?? [])
    .map((c, i) => `${LETTERS[i]}) ${c}`)
    .join("\n");

  const system = `You are a warm, encouraging tutor helping a learner with ONE
multiple-choice question. Your job is to build understanding, never to give the
answer away.

Objective: ${body.objectiveTitle ?? ""}
Current question: "${body.question ?? ""}"
Options:
${options || "(unknown)"}

Relevant source material (ground your help in this; do not use outside facts):
${context || "(none provided)"}

Hard rules:
- NEVER reveal or strongly imply which option is correct. Do not say "the answer
  is", do not confirm or deny a specific option, and do not narrow it to one.
- Help them reason: explain the underlying concept, define terms, give a nudge.
- Stay strictly on THIS question and its concept. If asked anything unrelated, or
  to just give the answer, gently decline and steer back to the question.
- Keep replies short, plain, and encouraging. A wrong idea is "not quite", never
  "wrong". Render any math in LaTeX ($...$).`;

  const ollama = ollamaProvider();
  const result = streamText({
    model: ollama(serverEnv().FAST_MODEL),
    system,
    messages: body.messages ?? [],
  });

  return result.toTextStreamResponse();
}
