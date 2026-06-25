"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/config/env";
import { extractPdfImages } from "@/lib/figures/extract";
import { captionFigure } from "@/lib/figures/vision";

export async function buildFigures(lessonId: string): Promise<{ count: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { count: 0 };

  const { data: lesson } = await supabase
    .from("lessons")
    .select("user_id, source_pdf_path")
    .eq("id", lessonId)
    .single();
  if (!lesson || lesson.user_id !== user.id || !lesson.source_pdf_path) {
    return { count: 0 };
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("figures")
    .select("id")
    .eq("lesson_id", lessonId)
    .limit(1);
  if (existing && existing.length) return { count: existing.length };

  const { data: blob } = await admin.storage
    .from("pdfs")
    .download(lesson.source_pdf_path);
  if (!blob) return { count: 0 };

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const images = await extractPdfImages(bytes);
  if (!images.length) return { count: 0 };

  let count = 0;
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const path = `${user.id}/${lessonId}/fig-${i + 1}.png`;

    const { error: upErr } = await admin.storage
      .from("figures")
      .upload(path, img.png, { contentType: "image/png", upsert: true });
    if (upErr) continue;

    const caption = await captionFigure(img.png.toString("base64"));

    const { error: insErr } = await admin.from("figures").insert({
      lesson_id: lessonId,
      storage_path: path,
      caption: caption?.caption ?? null,
      alt_text: caption?.alt ?? null,
      page: img.page,
      type: caption?.type ?? "diagram",
      model: serverEnv().VISION_MODEL,
    });
    if (!insErr) count += 1;
  }

  revalidatePath(`/lessons/${lessonId}`);
  return { count };
}
