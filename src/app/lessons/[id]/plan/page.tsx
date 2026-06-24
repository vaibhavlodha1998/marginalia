import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlanScreen } from "@/components/plan/plan-screen";
import type { Objective } from "@/types/lesson";

export default async function PlanPage({
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

  const { data: rows } = await supabase
    .from("objectives")
    .select("id, title, difficulty, order_index, status, included, planned_mcq_count")
    .eq("lesson_id", id)
    .order("order_index");

  const objectives: Objective[] = (rows ?? []).map((o) => ({
    id: o.id,
    title: o.title,
    difficulty: o.difficulty,
    orderIndex: o.order_index,
    status: o.status,
    included: o.included,
    plannedMcqCount: o.planned_mcq_count,
  }));

  return (
    <div className="flex flex-1 flex-col bg-paper">
      <header className="flex items-center gap-3.5 border-b border-border-strong px-11 py-[22px] max-md:px-6">
        <Link href="/" className="text-[13.5px] text-ink-2 hover:text-ink">
          ← Library
        </Link>
        <span className="text-border-muted">/</span>
        <span className="font-serif text-[16px] font-semibold text-ink">
          {lesson.title}
        </span>
      </header>
      <div className="mg-scroll flex-1 overflow-y-auto px-11 py-11 max-md:px-6">
        <div className="mx-auto max-w-[680px]">
          <div className="mb-3.5 text-[12.5px] font-semibold uppercase tracking-[0.06em] text-ink-3">
            Step 2 of 3 · Review the plan
          </div>
          <PlanScreen lessonId={id} objectives={objectives} />
        </div>
      </div>
    </div>
  );
}
