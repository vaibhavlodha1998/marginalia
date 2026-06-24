"use client";

import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import type { GradeResult } from "@/types/lesson";

const LETTERS = ["A", "B", "C", "D"];

export function McqCard({
  question,
  choices,
  selected,
  onSelect,
  result,
  grading,
  isLast,
  onSubmit,
  onNext,
  onTryAgain,
}: {
  question: string;
  choices: string[];
  selected: number | null;
  onSelect: (i: number) => void;
  result: GradeResult | null;
  grading: boolean;
  isLast: boolean;
  onSubmit: () => void;
  onNext: () => void;
  onTryAgain: () => void;
}) {
  const locked = result !== null;

  function optionStyle(i: number) {
    if (result?.correct && i === selected)
      return "border-correct bg-correct-bg";
    if (result && !result.correct && i === selected)
      return "border-wrong bg-wrong-bg";
    if (i === selected) return "border-primary bg-primary/5";
    return "border-border bg-surface hover:border-border-muted";
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-[30px] shadow-[0_4px_18px_rgba(44,39,34,0.04)]">
      <div className="mb-[22px] font-serif text-[22px] font-semibold leading-[1.35] tracking-[-0.01em] text-ink">
        {question}
      </div>

      <div className="flex flex-col gap-[11px]">
        {choices.map((choice, i) => (
          <button
            key={i}
            type="button"
            disabled={locked || grading}
            onClick={() => onSelect(i)}
            className={cn(
              "flex w-full items-center gap-3.5 rounded-[11px] border-[1.5px] px-4 py-3.5 text-left transition-colors",
              optionStyle(i),
              locked && "cursor-default",
            )}
          >
            <span
              className={cn(
                "flex size-[26px] flex-none items-center justify-center rounded-full border-[1.5px] text-[12.5px] font-semibold",
                i === selected
                  ? "border-transparent bg-primary text-on-primary"
                  : "border-border-muted text-ink-3",
                result?.correct && i === selected && "bg-correct",
                result && !result.correct && i === selected && "bg-wrong",
              )}
            >
              {LETTERS[i]}
            </span>
            <span className="flex-1 text-[15px] text-ink">{choice}</span>
          </button>
        ))}
      </div>

      {result?.correct && (
        <>
          <div className="mt-5 rounded-[12px] border border-correct-border bg-correct-bg p-[18px]">
            <div className="mb-2 flex items-center gap-2 text-[13px] font-bold text-correct-ink">
              <span className="flex size-[18px] items-center justify-center rounded-full bg-correct text-[11px] text-white">
                ✓
              </span>
              That&apos;s right
            </div>
            <p className="text-[14.5px] leading-[1.6] text-ink">
              {result.explanation}
            </p>
          </div>
          <div className="mt-[18px] flex justify-end">
            <Button onClick={onNext}>
              {isLast ? "Finish objective" : "Next question"}
            </Button>
          </div>
        </>
      )}

      {result && !result.correct && (
        <>
          <div className="mt-5 rounded-[12px] border border-wrong-border bg-wrong-bg p-[18px]">
            <div className="mb-2 flex items-center gap-2 text-[13px] font-bold text-wrong-ink">
              <span className="flex size-[18px] items-center justify-center rounded-full bg-wrong text-[12px] text-white">
                !
              </span>
              Not yet — here&apos;s a nudge
            </div>
            <p className="text-[14.5px] leading-[1.6] text-ink">{result.hint}</p>
          </div>
          <div className="mt-[18px] flex items-center justify-between gap-3">
            <span className="text-[13px] text-ink-3">
              No penalty — take another run at it.
            </span>
            <Button variant="secondary" onClick={onTryAgain}>
              Try again
            </Button>
          </div>
        </>
      )}

      {!result && (
        <div className="mt-[22px] flex justify-end">
          <Button onClick={onSubmit} disabled={selected === null || grading}>
            {grading ? "Checking…" : "Submit answer"}
          </Button>
        </div>
      )}
    </div>
  );
}
