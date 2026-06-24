import { DifficultyPill } from "@/components/ui/difficulty-pill";
import type { WorkspaceObjective } from "./types";

export function QuizTab({
  objectives,
}: {
  objectives: WorkspaceObjective[];
}) {
  const current =
    objectives.find((o) => o.status === "current") ?? objectives[0];
  const index = current ? objectives.indexOf(current) + 1 : 0;

  if (!current) {
    return (
      <div className="mx-auto max-w-[680px] p-10 text-center max-md:p-6">
        <p className="text-[15px] text-ink-2">No objectives to quiz yet.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[680px] p-10 max-md:p-6">
      <div className="mb-2 flex items-center gap-3">
        <span className="font-serif text-[13px] tracking-[0.02em] text-ink-3">
          OBJECTIVE {index} OF {objectives.length}
        </span>
        <DifficultyPill difficulty={current.difficulty} />
      </div>
      <h2 className="mb-6 font-serif text-[23px] font-semibold tracking-[-0.01em] text-ink">
        {current.title}
      </h2>

      <div className="rounded-2xl border border-border bg-surface p-10 text-center">
        <p className="font-serif text-[18px] font-semibold text-ink-2">
          The interactive quiz is coming next.
        </p>
        <p className="mx-auto mt-2 max-w-[420px] text-[14px] leading-relaxed text-ink-3">
          Questions are authored from this objective and graded inline, with a
          tutor on hand for no-spoiler hints.
        </p>
      </div>
    </div>
  );
}
