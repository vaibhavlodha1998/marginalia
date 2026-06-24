import { RichText } from "@/components/ui/rich-text";
import type { ProgressMap, WorkspaceObjective } from "./types";

export function ProgressTab({
  objectives,
  progress,
  correct,
  total,
}: {
  objectives: WorkspaceObjective[];
  progress: ProgressMap;
  correct: number;
  total: number;
}) {
  const pct = total ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-[680px] p-10 max-md:p-6">
      <h2 className="mb-1.5 font-serif text-[26px] font-semibold tracking-[-0.02em] text-ink">
        Your progress
      </h2>
      <p className="mb-7 text-[14.5px] text-ink-2">
        How far you&apos;ve come in this lesson so far.
      </p>

      <div className="mb-7 flex gap-3.5 max-sm:flex-col">
        <div className="flex-1 rounded-[14px] border border-border bg-surface p-[22px]">
          <div className="font-serif text-[34px] font-semibold leading-none text-primary">
            {correct}
            <span className="text-[18px] text-ink-3">/{total}</span>
          </div>
          <div className="mt-1.5 text-[13px] text-ink-2">
            Questions answered correctly
          </div>
        </div>
        <div className="flex-1 rounded-[14px] border border-border bg-surface p-[22px]">
          <div className="font-serif text-[34px] font-semibold leading-none text-primary">
            {pct}%
          </div>
          <div className="mt-1.5 text-[13px] text-ink-2">Lesson complete</div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {objectives.map((o) => {
          const p = progress[o.id] ?? { total: 0, correct: 0, firstTry: 0 };
          const planned = o.plannedMcqCount ?? p.total;
          const oPct = planned ? Math.round((p.correct / planned) * 100) : 0;
          return (
            <div
              key={o.id}
              className="rounded-[12px] border border-border bg-surface px-[18px] py-4"
            >
              <div className="mb-2.5 flex items-center justify-between">
                <RichText
                  inline
                  className="font-serif text-[16px] font-semibold text-ink"
                >
                  {o.title}
                </RichText>
                <span className="text-[12.5px] font-semibold text-ink-2">
                  {p.correct}/{planned}
                </span>
              </div>
              <div className="h-[5px] overflow-hidden rounded-full bg-paper">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${oPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
