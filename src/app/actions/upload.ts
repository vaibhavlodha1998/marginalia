"use server";

import { createClient } from "@/lib/supabase/server";
import { extractPdfText } from "@/lib/pdf/extract";

export async function ingestLesson(input: {
  path: string;
  filename: string;
}): Promise<{ lessonId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const title = input.filename.replace(/\.pdf$/i, "").trim() || "Untitled lesson";

  const { data: lesson, error: insErr } = await supabase
    .from("lessons")
    .insert({
      user_id: user.id,
      title,
      source_filename: input.filename,
      source_pdf_path: input.path,
      status: "parsing",
    })
    .select("id")
    .single();
  if (insErr) throw new Error(insErr.message);
  const lessonId = lesson.id as string;

  const { data: blob, error: dlErr } = await supabase.storage
    .from("pdfs")
    .download(input.path);
  if (dlErr) throw new Error(dlErr.message);

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const { pages } = await extractPdfText(bytes);

  if (pages.length) {
    const rows = pages.map((text, i) => ({
      lesson_id: lessonId,
      page_no: i + 1,
      text,
      char_count: text.length,
    }));
    const { error: pagesErr } = await supabase.from("pdf_pages").insert(rows);
    if (pagesErr) throw new Error(pagesErr.message);
  }

  await supabase
    .from("lessons")
    .update({ pages: pages.length })
    .eq("id", lessonId);

  return { lessonId };
}
