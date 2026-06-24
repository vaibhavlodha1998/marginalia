"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getObjectiveMcqs,
  generateObjectiveMcqs,
  gradeMcq,
  completeObjective,
} from "@/app/actions/quiz";
import { DifficultyPill } from "@/components/ui/difficulty-pill";
import { ThinkingDots } from "@/components/ui/thinking-dots";
import { RichText } from "@/components/ui/rich-text";
import { useQuizStore } from "@/lib/store/quiz-store";
import { McqCard } from "./mcq-card";
import type { Difficulty, GradeResult, McqPublic } from "@/types/lesson";

type Phase = "loading" | "generating" | "ready" | "completing" | "error";
type Answer = { selected: number | null; result: GradeResult | null };

export function QuizRunner({
  objectiveId,
  nextObjectiveId,
  title,
  difficulty,
  objNum,
  objTotal,
}: {
  objectiveId: string;
  nextObjectiveId?: string;
  title: string;
  difficulty: Difficulty;
  objNum: number;
  objTotal: number;
}) {
  const router = useRouter();
  const setActiveQuestion = useQuizStore((s) => s.setActive);
  const started = useRef(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const [mcqs, setMcqs] = useState<McqPublic[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [grading, setGrading] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        let list = await getObjectiveMcqs(objectiveId);
        if (!list.length) {
          setPhase("generating");
          await generateObjectiveMcqs(objectiveId);
          list = await getObjectiveMcqs(objectiveId);
        }
        if (!list.length) {
          setPhase("error");
          return;
        }
        setMcqs(list);
        setAnswers(list.map(() => ({ selected: null, result: null })));
        setPhase("ready");
        // Pre-generate the next objective in the background so advancing is seamless.
        if (nextObjectiveId) {
          generateObjectiveMcqs(nextObjectiveId).catch(() => {});
        }
      } catch {
        setPhase("error");
      }
    })();
  }, [objectiveId, nextObjectiveId]);

  // Publish the current question so the tutor chat can scope to it.
  useEffect(() => {
    const m = mcqs[qIndex];
    setActiveQuestion(
      m
        ? { mcqId: m.id, question: m.question, choices: m.choices, objectiveTitle: title }
        : null,
    );
    return () => setActiveQuestion(null);
  }, [mcqs, qIndex, title, setActiveQuestion]);

  const current = answers[qIndex] ?? { selected: null, result: null };

  function patch(update: Partial<Answer>) {
    setAnswers((a) =>
      a.map((x, i) => (i === qIndex ? { ...x, ...update } : x)),
    );
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
    setPhase("completing");
    await completeObjective(objectiveId);
    router.refresh();
  }

  const answeredCount = answers.filter((a) => a.result?.correct).length;

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
          </div>
          <McqCard
            question={mcqs[qIndex].question}
            choices={mcqs[qIndex].choices}
            selected={current.selected}
            onSelect={(i) => patch({ selected: i })}
            result={current.result}
            grading={grading}
            isLast={qIndex + 1 === mcqs.length}
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
              ? "Writing and checking your questions…"
              : phase === "completing"
                ? "Saving your progress…"
                : "Loading…"}
          </div>
          {phase === "generating" && (
            <p className="mx-auto mt-2 max-w-[380px] text-[13.5px] text-ink-3">
              Questions are authored from the source and reviewed by a panel
              before you see them.
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
