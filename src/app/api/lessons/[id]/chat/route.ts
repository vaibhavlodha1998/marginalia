import { streamText, type ModelMessage } from "ai";
import { createClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/config/env";
import { ollamaProvider } from "@/lib/ai/ollama";
import { embedOne, toVector } from "@/lib/rag/embed";
import { rateLimit } from "@/lib/ratelimit";
import { logError } from "@/lib/log";

const LETTERS = ["A", "B", "C", "D"];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  // Paid model path: never serve it unauthenticated.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  if (!rateLimit(`chat:${user.id}`, 20, 60_000)) {
    return new Response("Too many requests", { status: 429 });
  }

  // Ownership: RLS returns no row for a lesson the caller doesn't own.
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!lesson) return new Response("Not found", { status: 404 });

  const body = (await req.json()) as {
    messages: ModelMessage[];
    mcqId?: string;
  };

  // Derive the question from the MCQ id, never from client-supplied text.
  let question = "";
  let choices: string[] = [];
  let objectiveTitle = "";
  if (body.mcqId) {
    const { data: mcq } = await supabase
      .from("mcqs")
      .select("question, choices, objective_id")
      .eq("id", body.mcqId)
      .maybeSingle();
    if (mcq) {
      const { data: obj } = await supabase
        .from("objectives")
        .select("title, lesson_id")
        .eq("id", mcq.objective_id)
        .maybeSingle();
      if (obj?.lesson_id === id) {
        question = mcq.question as string;
        choices = (mcq.choices as string[]) ?? [];
        objectiveTitle = obj.title as string;
      }
    }
  }

  let context = "";
  if (question) {
    try {
      const vec = await embedOne(question);
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
    } catch (e) {
      logError("chat.grounding", e);
    }
  }

  // Persist the new user turn.
  const last = body.messages?.[body.messages.length - 1];
  if (last?.role === "user" && typeof last.content === "string") {
    await supabase.from("chat_messages").insert({
      lesson_id: id,
      user_id: user.id,
      role: "user",
      kind: "chat",
      content: last.content,
      mcq_id: body.mcqId ?? null,
    });
  }

  const options = choices.map((c, i) => `${LETTERS[i]}) ${c}`).join("\n");

  const system = `You are a warm, encouraging tutor helping a learner with ONE
multiple-choice question. Your job is to build understanding, never to give the
answer away.

Objective: ${objectiveTitle}
Current question: "${question}"
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
    temperature: 0,
    system,
    messages: body.messages ?? [],
    onFinish: async ({ text }) => {
      if (!text.trim()) return;
      await supabase.from("chat_messages").insert({
        lesson_id: id,
        user_id: user.id,
        role: "tutor",
        kind: "chat",
        content: text,
        mcq_id: body.mcqId ?? null,
      });
    },
  });

  return result.toTextStreamResponse();
}
