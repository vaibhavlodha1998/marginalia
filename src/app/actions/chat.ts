"use server";

import { createClient } from "@/lib/supabase/server";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

// Prior tutor conversation for one question, so it survives a refresh.
export async function getChatMessages(
  lessonId: string,
  mcqId: string,
): Promise<ChatTurn[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("lesson_id", lessonId)
    .eq("mcq_id", mcqId)
    .order("created_at");

  return (data ?? [])
    .filter((m) => m.role === "user" || m.role === "tutor")
    .map((m) => ({
      role: m.role === "tutor" ? "assistant" : "user",
      content: m.content as string,
    }));
}
