"use client";

import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/ui/rich-text";
import type { GradeResult } from "@/types/lesson";

const LETTERS = ["A", "B", "C", "D"];

export function McqCard({
  question,
  choices,
  figureUrl,
  selected,
  onSelect,
  result,
  grading,
  isLast,
  isReview,
  canPrevious,
  onSubmit,
  onNext,
  onTryAgain,
  onPrevious,
}: {
  question: string;
  choices: string[];
  figureUrl: string | null;
  selected: number | null;
  onSelect: (i: number) => void;
  result: GradeResult | null;
  grading: boolean;
  isLast: boolean;
  isReview: boolean;
  canPrevious: boolean;
  onSubmit: () => void;
  onNext: () => void;
  onTryAgain: () => void;
  onPrevious: () => void;
}) {
  const locked = result !== null;
  const showNext = result !== null && (result.correct || isReview) && !isLast;
  const showFinish = result?.correct === true && isLast && !isReview;

  function optionStyle(i: number) {
    if (result?.correct && i === selected) return "border-correct bg-correct-bg";
    if (result && !result.correct && i === selected)
      return "border-wrong bg-wrong-bg";
    if (i === selected) return "border-primary bg-primary/5";
    return "border-border bg-surface hover:border-border-muted";
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-8 shadow-[0_4px_18px_rgba(44,39,34,0.04)] max-md:p-6">
      {figureUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={figureUrl}
          alt="Figure for this question"
          className="mb-5 max-h-[340px] w-full rounded-[12px] border border-border bg-white object-contain p-2"
          style={{ mixBlendMode: "multiply" }}
        />
      )}

      <RichText className="mb-6 font-serif text-[24px] font-semibold leading-[1.35] tracking-[-0.01em] text-ink">
        {question}
      </RichText>

      <div className="flex flex-col gap-3">
        {choices.map((choice, i) => (
          <button
            key={i}
            type="button"
            disabled={locked || grading}
            onClick={() => onSelect(i)}
            className={cn(
              "flex w-full items-center gap-4 rounded-[12px] border-[1.5px] px-[18px] py-4 text-left transition-colors",
              optionStyle(i),
              locked && "cursor-default",
            )}
          >
            <span
              className={cn(
                "flex size-[28px] flex-none items-center justify-center rounded-full border-[1.5px] text-[13px] font-semibold",
                i === selected
                  ? "border-transparent bg-primary text-on-primary"
                  : "border-border-muted text-ink-3",
                result?.correct && i === selected && "bg-correct",
                result && !result.correct && i === selected && "bg-wrong",
              )}
            >
              {LETTERS[i]}
            </span>
            <RichText inline className="flex-1 text-[15.5px] leading-[1.5] text-ink">
              {choice}
            </RichText>
          </button>
        ))}
      </div>

      {result?.correct && (
        <div className="mt-6 rounded-[14px] border border-correct-border bg-correct-bg p-5">
          <div className="mb-2.5 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-correct-ink">
            <span className="flex size-[18px] items-center justify-center rounded-full bg-correct text-[11px] text-white">
              ✓
            </span>
            That&apos;s right
          </div>
          <RichText className="text-[16px] leading-[1.75] text-ink">
            {result.explanation}
          </RichText>
        </div>
      )}

      {result && !result.correct && (
        <div className="mt-6 rounded-[14px] border border-wrong-border bg-wrong-bg p-5">
          <div className="mb-2.5 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-wrong-ink">
            <span className="flex size-[18px] items-center justify-center rounded-full bg-wrong text-[12px] text-white">
              !
            </span>
            Not yet — here&apos;s a nudge
          </div>
          <RichText className="text-[16px] leading-[1.75] text-ink">
            {result.hint}
          </RichText>
          {!isReview && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-[13px] text-ink-3">
                No penalty for retrying.
              </span>
              <Button onClick={onTryAgain}>Try again</Button>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrevious}
          disabled={!canPrevious}
        >
          ← Previous
        </Button>

        {!result && (
          <Button onClick={onSubmit} disabled={selected === null || grading}>
            {grading ? "Checking…" : "Submit answer"}
          </Button>
        )}
        {showNext && <Button onClick={onNext}>Next question →</Button>}
        {showFinish && <Button onClick={onNext}>Finish objective →</Button>}
        {result && !result.correct && !isReview && (
          <span className="text-[13px] italic text-ink-3">
            Use the hint above ↑
          </span>
        )}
      </div>
    </div>
  );
}
