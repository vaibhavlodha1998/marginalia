"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getObjectiveReview,
  getObjectiveGenStatus,
  gradeMcq,
  completeObjective,
} from "@/app/actions/quiz";

// Plain request, so generation doesn't block the action queue (grading/nav).
function fireGenerate(objectiveId: string) {
  return fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ objectiveId }),
  });
}
import { DifficultyPill } from "@/components/ui/difficulty-pill";
import { ThinkingDots } from "@/components/ui/thinking-dots";
import { RichText } from "@/components/ui/rich-text";
import { useQuizStore } from "@/lib/store/quiz-store";
import { McqCard } from "./mcq-card";
import type { Difficulty, GradeResult, McqPublic, ReviewMcq } from "@/types/lesson";

type Phase = "loading" | "generating" | "ready" | "completing" | "error";
type Answer = { selected: number | null; result: GradeResult | null };

function toPublic(r: ReviewMcq): McqPublic {
  return {
    id: r.id,
    objectiveId: r.objectiveId,
    question: r.question,
    choices: r.choices,
    orderIndex: r.orderIndex,
    figureUrl: r.figureUrl,
    figurePlacement: r.figurePlacement,
  };
}

function toAnswer(r: ReviewMcq): Answer {
  return r.review
    ? {
        selected: r.review.selectedIndex,
        result: {
          correct: r.review.correct,
          explanation: r.review.explanation,
          choiceRationales: r.review.choiceRationales,
          hint: r.review.hint,
          attempts: r.review.attempts,
        },
      }
    : { selected: null, result: null };
}

export function QuizRunner({
  objectiveId,
  nextObjectiveId,
  isReview,
  title,
  difficulty,
  objNum,
  objTotal,
}: {
  objectiveId: string;
  nextObjectiveId?: string;
  isReview: boolean;
  title: string;
  difficulty: Difficulty;
  objNum: number;
  objTotal: number;
}) {
  const router = useRouter();
  const setActiveQuestion = useQuizStore((s) => s.setActive);
  const started = useRef(false);
  const initialized = useRef(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const [mcqs, setMcqs] = useState<McqPublic[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [grading, setGrading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    // Merge newly generated questions in without disturbing answered ones.
    const apply = (list: ReviewMcq[]) => {
      setMcqs((prev) => (list.length > prev.length ? list.map(toPublic) : prev));
      setAnswers((prev) => {
        if (list.length <= prev.length) return prev;
        const next = [...prev];
        for (let i = prev.length; i < list.length; i++) next[i] = toAnswer(list[i]);
        return next;
      });
      if (!initialized.current && list.length) {
        initialized.current = true;
        const firstUnanswered = list.findIndex((r) => !r.review?.correct);
        setQIndex(
          isReview
            ? 0
            : firstUnanswered === -1
              ? Math.max(0, list.length - 1)
              : firstUnanswered,
        );
      }
    };

    const poll = async () => {
      if (cancelled) return;
      const list = await getObjectiveReview(objectiveId);
      apply(list);
      if (list.length) setPhase("ready");
      const { status } = await getObjectiveGenStatus(objectiveId);
      if (status === "ready" || status === "error") {
        setGenerating(false);
        if (!list.length) setPhase("error");
        return;
      }
      setGenerating(true);
      timer = setTimeout(poll, 1500);
    };

    (async () => {
      try {
        const list = await getObjectiveReview(objectiveId);
        apply(list);
        const { status } = await getObjectiveGenStatus(objectiveId);

        if (list.length && status === "ready") {
          setPhase("ready");
        } else {
          // Always (re)fire: the claim dedupes a live run and reclaims a stale one,
          // so a generation that died can't leave the objective wedged.
          fireGenerate(objectiveId).catch(() => {});
          if (list.length) {
            setPhase("ready");
            setGenerating(true);
          } else {
            setPhase("generating");
          }
          timer = setTimeout(poll, 1500);
        }

        // Pre-generate the next objective so advancing is seamless.
        if (nextObjectiveId) {
          fireGenerate(nextObjectiveId).catch(() => {});
        }
      } catch {
        if (!cancelled) setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [objectiveId, nextObjectiveId, isReview]);

  // Publish the current question so the tutor chat can scope to it.
  useEffect(() => {
    const m = mcqs[qIndex];
    setActiveQuestion(
      m
        ? {
            mcqId: m.id,
            question: m.question,
            choices: m.choices,
            objectiveTitle: title,
            figureUrl: m.figureUrl,
            figurePlacement: m.figurePlacement,
          }
        : null,
    );
    return () => setActiveQuestion(null);
  }, [mcqs, qIndex, title, setActiveQuestion]);

  const current = answers[qIndex] ?? { selected: null, result: null };

  function patch(update: Partial<Answer>) {
    setAnswers((a) => a.map((x, i) => (i === qIndex ? { ...x, ...update } : x)));
  }

  async function submit() {
    if (current.selected === null) return;
    setGrading(true);
    try {
      const res = await gradeMcq(mcqs[qIndex].id, current.selected);
      patch({ result: res });
    } catch {
      // keep selection so the user can retry
    } finally {
      setGrading(false);
    }
  }

  async function next() {
    if (qIndex + 1 < mcqs.length) {
      setQIndex(qIndex + 1);
      return;
    }
    if (generating || isReview) return; // wait for more, or already finished
    setPhase("completing");
    await completeObjective(objectiveId);
    router.refresh();
  }

  const answeredCount = answers.filter((a) => a.result?.correct).length;
  const isLastLoaded = qIndex + 1 === mcqs.length;
  const awaitingNext = isLastLoaded && generating;

  return (
    <div className="mx-auto max-w-[860px] p-10 max-md:p-6">
      <div className="mb-2 flex items-center gap-3">
        <span className="font-serif text-[13px] tracking-[0.02em] text-ink-3">
          OBJECTIVE {objNum} OF {objTotal}
        </span>
        <DifficultyPill difficulty={difficulty} />
      </div>
      <RichText className="mb-[22px] font-serif text-[23px] font-semibold tracking-[-0.01em] text-ink">
        {title}
      </RichText>

      {phase === "ready" && mcqs.length > 0 && (
        <>
          <div className="mb-4 flex items-center gap-2.5">
            <span className="text-[12.5px] font-semibold text-ink-2">
              Question {qIndex + 1} of {mcqs.length}
            </span>
            <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-border-strong">
              <div
                className="h-full bg-primary transition-[width]"
                style={{ width: `${(answeredCount / mcqs.length) * 100}%` }}
              />
            </div>
            {generating && (
              <span className="text-[11.5px] text-ink-3">Writing more…</span>
            )}
          </div>
          <McqCard
            question={mcqs[qIndex].question}
            choices={mcqs[qIndex].choices}
            figureUrl={mcqs[qIndex].figureUrl}
            figurePlacement={mcqs[qIndex].figurePlacement}
            selected={current.selected}
            onSelect={(i) => patch({ selected: i })}
            result={current.result}
            grading={grading}
            isLast={isLastLoaded && !generating}
            awaitingNext={awaitingNext}
            isReview={isReview}
            canPrevious={qIndex > 0}
            onSubmit={submit}
            onNext={next}
            onTryAgain={() => patch({ selected: null, result: null })}
            onPrevious={() => setQIndex(Math.max(0, qIndex - 1))}
          />
        </>
      )}

      {(phase === "loading" ||
        phase === "generating" ||
        phase === "completing") && (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center">
          <ThinkingDots className="mb-4 justify-center" />
          <div className="font-serif text-[18px] font-semibold text-ink-2">
            {phase === "generating"
              ? "Writing your first question…"
              : phase === "completing"
                ? "Saving your progress…"
                : "Loading…"}
          </div>
          {phase === "generating" && (
            <p className="mx-auto mt-2 max-w-[380px] text-[13.5px] text-ink-3">
              Questions are authored from the source and reviewed by a panel
              before you see them. The first appears in a few seconds.
            </p>
          )}
        </div>
      )}

      {phase === "error" && (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center">
          <p className="text-[15px] text-ink-2">
            Couldn&apos;t prepare questions for this objective. Refresh to try
            again.
          </p>
        </div>
      )}
    </div>
  );
}
