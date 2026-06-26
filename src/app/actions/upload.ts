"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractPdfText } from "@/lib/pdf/extract";
import { buildLessonChunks } from "@/lib/rag/store";
import { logError } from "@/lib/log";

// Below this, a PDF has no usable extractable text (e.g. a scanned image).
const MIN_TEXT_CHARS = 200;

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

  // Remove the half-created lesson + file so a failed parse leaves no zombie.
  async function abort(message: string): Promise<never> {
    await supabase.from("lessons").delete().eq("id", lessonId);
    await supabase.storage.from("pdfs").remove([input.path]);
    throw new Error(message);
  }

  const { data: blob, error: dlErr } = await supabase.storage
    .from("pdfs")
    .download(input.path);
  if (dlErr) await abort(dlErr.message);

  const bytes = new Uint8Array(await blob!.arrayBuffer());

  let pages: string[];
  try {
    ({ pages } = await extractPdfText(bytes));
  } catch {
    return abort(
      "We couldn't read this PDF — it may be corrupted or password-protected. Please try another file.",
    );
  }

  const totalChars = pages.reduce((n, t) => n + t.trim().length, 0);
  if (totalChars < MIN_TEXT_CHARS) {
    return abort(
      "We couldn't find readable text in this PDF. It looks like a scanned image — please upload a text-based PDF.",
    );
  }

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
    .update({ pages: pages.length, status: "plan_pending" })
    .eq("id", lessonId);

  // Embed chunks for retrieval after the response, so ingest stays fast. Missing
  // embeddings just mean MCQ grounding falls back to raw text.
  const named = pages.map((text, i) => ({ pageNo: i + 1, text }));
  after(async () => {
    try {
      await buildLessonChunks(supabase, lessonId, named);
    } catch (e) {
      logError("upload.embeddings", e, { lessonId });
    }
  });

  return { lessonId };
}
