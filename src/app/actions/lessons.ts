"use server";

import { createClient } from "@/lib/supabase/server";
import type { Lesson } from "@/types/lesson";

export async function getLessons(): Promise<Lesson[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("id, title, subject, source_pdf_path, pages, status, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    subject: r.subject,
    sourcePdfPath: r.source_pdf_path,
    pages: r.pages,
    status: r.status,
    createdAt: r.created_at,
  }));
}
