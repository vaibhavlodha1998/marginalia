import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, title, status")
    .eq("id", id)
    .single();

  if (!lesson) notFound();
  if (lesson.status === "plan_pending") redirect(`/lessons/${id}/plan`);

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-paper p-8 text-center">
      <h1 className="font-serif text-2xl font-semibold text-ink">
        {lesson.title}
      </h1>
      <p className="mt-2 text-[14.5px] text-ink-2">
        {lesson.status === "parsing"
          ? "Still preparing this lesson…"
          : "The lesson workspace is coming next."}
      </p>
      <Link href="/" className="mt-6 text-[13.5px] font-semibold text-primary">
        ← Back to library
      </Link>
    </div>
  );
}
