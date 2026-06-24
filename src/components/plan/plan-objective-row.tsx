"use client";

import { cn } from "@/lib/utils/cn";
import { RichText } from "@/components/ui/rich-text";
import type { Difficulty } from "@/types/lesson";

const PILL: Record<Difficulty, string> = {
  easy: "text-easy bg-easy/10 border-easy/30",
  medium: "text-medium bg-medium/10 border-medium/30",
  hard: "text-hard bg-hard/10 border-hard/30",
};

export function PlanObjectiveRow({
  title,
  difficulty,
  questionCount,
  included,
  onToggle,
  onCycleDifficulty,
}: {
  title: string;
  difficulty: Difficulty;
  questionCount: number;
  included: boolean;
  onToggle: () => void;
  onCycleDifficulty: () => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-[12px] border border-border bg-surface px-[18px] py-4">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={included}
        className={cn(
          "flex size-[22px] shrink-0 items-center justify-center rounded-[6px] border-[1.5px] text-[13px] text-on-primary",
          included ? "border-primary bg-primary" : "border-border-muted bg-transparent",
        )}
      >
        {included ? "✓" : ""}
      </button>

      <div className={cn("min-w-0 flex-1", included ? "opacity-100" : "opacity-50")}>
        <RichText
          inline
          className="font-serif text-[17px] font-semibold tracking-[-0.01em] text-ink"
        >
          {title}
        </RichText>
        <div className="mt-0.5 text-[12.5px] text-ink-3">
          {questionCount} questions
        </div>
      </div>

      <button
        type="button"
        onClick={onCycleDifficulty}
        className={cn(
          "shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold capitalize",
          PILL[difficulty],
        )}
      >
        {difficulty}
      </button>
    </div>
  );
}
