import Link from "next/link";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { Lesson } from "@/types/lesson";

const STATUS_LABEL: Record<Lesson["status"], string> = {
  parsing: "Parsing…",
  plan_pending: "Plan ready to review",
  in_progress: "In progress",
  complete: "Completed",
};

function basename(path: string | null) {
  if (!path) return "—";
  return path.split("/").pop() ?? path;
}

export function LessonCard({ lesson }: { lesson: Lesson }) {
  const progress = lesson.status === "complete" ? 100 : 0;

  return (
    <Link
      href={`/lessons/${lesson.id}`}
      className="group block rounded-[14px] border border-border bg-surface p-[22px] transition hover:-translate-y-0.5 hover:border-border-muted hover:shadow-[0_12px_28px_rgba(44,39,34,0.09)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-[52px] w-[42px] items-end rounded-[5px_8px_8px_5px] border border-border border-l-[3px] border-l-primary bg-surface-2 p-1.5">
          <div className="h-[3px] w-full rounded-sm bg-[#e0d5c1]" />
        </div>
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-ink-3">
          {lesson.subject ?? "Lesson"}
        </span>
      </div>

      <h3 className="mb-1.5 mt-4 font-serif text-[20px] font-semibold tracking-[-0.01em] text-ink">
        {lesson.title}
      </h3>
      <div className="mb-[18px] truncate font-mono text-[12.5px] text-ink-3">
        {basename(lesson.sourcePdfPath)}
      </div>

      <ProgressBar value={progress} className="mb-2.5 h-1.5" />

      <div className="flex items-center justify-between">
        <span className="text-[12.5px] text-ink-2">
          {STATUS_LABEL[lesson.status]}
        </span>
        {lesson.status === "in_progress" && (
          <span className="text-[13px] font-semibold text-primary">Resume →</span>
        )}
        {lesson.status === "complete" && (
          <span className="text-[13px] font-semibold text-easy">Review →</span>
        )}
      </div>
    </Link>
  );
}
