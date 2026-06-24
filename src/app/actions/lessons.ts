"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Lesson } from "@/types/lesson";

export async function getLessons(): Promise<Lesson[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select(
      "id, title, subject, source_filename, source_pdf_path, pages, status, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    subject: r.subject,
    sourceFilename: r.source_filename,
    sourcePdfPath: r.source_pdf_path,
    pages: r.pages,
    status: r.status,
    createdAt: r.created_at,
  }));
}

export async function deleteLesson(lessonId: string): Promise<void> {
  const supabase = await createClient();

  const { data: lesson } = await supabase
    .from("lessons")
    .select("source_pdf_path")
    .eq("id", lessonId)
    .single();

  if (lesson?.source_pdf_path) {
    await supabase.storage.from("pdfs").remove([lesson.source_pdf_path]);
  }

  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
}
