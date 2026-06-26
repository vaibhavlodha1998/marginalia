"use server";

import { createClient } from "@/lib/supabase/server";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

// Prior conversation so it survives a refresh. Pass an mcqId for a question's
// tutor thread, or null for the Source-tab document thread.
export async function getChatMessages(
  lessonId: string,
  mcqId: string | null,
): Promise<ChatTurn[]> {
  const supabase = await createClient();
  const base = supabase
    .from("chat_messages")
    .select("role, content")
    .eq("lesson_id", lessonId);
  const { data } = await (mcqId ? base.eq("mcq_id", mcqId) : base.is("mcq_id", null))
    .order("created_at");

  return (data ?? [])
    .filter((m) => m.role === "user" || m.role === "tutor")
    .map((m) => ({
      role: m.role === "tutor" ? "assistant" : "user",
      content: m.content as string,
    }));
}
