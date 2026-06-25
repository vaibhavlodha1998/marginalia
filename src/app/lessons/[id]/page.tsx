import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LessonWorkspace } from "@/components/workspace/lesson-workspace";
import type {
  ProgressMap,
  WorkspaceFigure,
  WorkspacePage,
} from "@/components/workspace/types";
import type { Objective } from "@/types/lesson";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, title, subject, source_filename, source_pdf_path, pages, status")
    .eq("id", id)
    .single();
  if (!lesson) notFound();

  let pdfUrl: string | null = null;
  if (lesson.source_pdf_path) {
    const { data: signed } = await supabase.storage
      .from("pdfs")
      .createSignedUrl(lesson.source_pdf_path, 3600);
    pdfUrl = signed?.signedUrl ?? null;
  }
  if (lesson.status === "parsing" || lesson.status === "plan_pending") {
    redirect(`/lessons/${id}/plan`);
  }

  const { data: objRows } = await supabase
    .from("objectives")
    .select("id, title, section, difficulty, order_index, status, included, planned_mcq_count")
    .eq("lesson_id", id)
    .eq("included", true)
    .order("order_index");

  const objectives: Objective[] = (objRows ?? []).map((o) => ({
    id: o.id,
    title: o.title,
    section: o.section,
    difficulty: o.difficulty,
    orderIndex: o.order_index,
    status: o.status,
    included: o.included,
    plannedMcqCount: o.planned_mcq_count,
  }));

  const { data: progRows } = await supabase
    .from("objective_progress")
    .select("objective_id, total_mcqs, correct_mcqs, first_try_correct")
    .eq("lesson_id", id);

  const progress: ProgressMap = Object.fromEntries(
    (progRows ?? []).map((p) => [
      p.objective_id,
      { total: p.total_mcqs, correct: p.correct_mcqs, firstTry: p.first_try_correct },
    ]),
  );

  const { data: pageRows } = await supabase
    .from("pdf_pages")
    .select("page_no, text")
    .eq("lesson_id", id)
    .order("page_no");

  const pages: WorkspacePage[] = (pageRows ?? []).map((p) => ({
    pageNo: p.page_no,
    text: p.text,
  }));

  const { data: figRows } = await supabase
    .from("figures")
    .select("id, caption, alt_text, page, storage_path")
    .eq("lesson_id", id)
    .order("page");

  const signedFigures = await Promise.all(
    (figRows ?? []).map(async (f) => {
      const { data: signed } = await supabase.storage
        .from("figures")
        .createSignedUrl(f.storage_path, 3600);
      return signed?.signedUrl
        ? {
            id: f.id,
            caption: f.caption,
            altText: f.alt_text,
            page: f.page,
            url: signed.signedUrl,
          }
        : null;
    }),
  );
  const figures: WorkspaceFigure[] = signedFigures.filter(
    (f): f is WorkspaceFigure => f !== null,
  );

  return (
    <LessonWorkspace
      lesson={{
        id: lesson.id,
        title: lesson.title,
        subject: lesson.subject,
        sourceFilename: lesson.source_filename,
        pages: lesson.pages,
        status: lesson.status,
      }}
      objectives={objectives}
      progress={progress}
      pages={pages}
      pdfUrl={pdfUrl}
      figures={figures}
    />
  );
}
