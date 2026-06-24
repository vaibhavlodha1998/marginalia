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
import { McqCard } from "./mcq-card";
import type { Difficulty, GradeResult, McqPublic } from "@/types/lesson";

type Phase = "loading" | "generating" | "ready" | "completing" | "error";

export function QuizRunner({
  objectiveId,
  title,
  difficulty,
  objNum,
  objTotal,
}: {
  objectiveId: string;
  title: string;
  difficulty: Difficulty;
  objNum: number;
  objTotal: number;
}) {
  const router = useRouter();
  const started = useRef(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const [mcqs, setMcqs] = useState<McqPublic[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<GradeResult | null>(null);
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
        if (!list.length) setPhase("error");
        else {
          setMcqs(list);
          setPhase("ready");
        }
      } catch {
        setPhase("error");
      }
    })();
  }, [objectiveId]);

  async function submit() {
    if (selected === null) return;
    setGrading(true);
    try {
      const res = await gradeMcq(mcqs[qIndex].id, selected);
      setResult(res);
    } catch {
      // leave selection so the user can retry
    } finally {
      setGrading(false);
    }
  }

  function tryAgain() {
    setSelected(null);
    setResult(null);
  }

  async function next() {
    if (qIndex + 1 < mcqs.length) {
      setQIndex(qIndex + 1);
      setSelected(null);
      setResult(null);
      return;
    }
    setPhase("completing");
    await completeObjective(objectiveId);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-[680px] p-10 max-md:p-6">
      <div className="mb-2 flex items-center gap-3">
        <span className="font-serif text-[13px] tracking-[0.02em] text-ink-3">
          OBJECTIVE {objNum} OF {objTotal}
        </span>
        <DifficultyPill difficulty={difficulty} />
      </div>
      <h2 className="mb-[22px] font-serif text-[23px] font-semibold tracking-[-0.01em] text-ink">
        {title}
      </h2>

      {phase === "ready" && mcqs.length > 0 && (
        <>
          <div className="mb-4 flex items-center gap-2.5">
            <span className="text-[12.5px] font-semibold text-ink-2">
              Question {qIndex + 1} of {mcqs.length}
            </span>
            <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-border-strong">
              <div
                className="h-full bg-primary transition-[width]"
                style={{ width: `${(qIndex / mcqs.length) * 100}%` }}
              />
            </div>
          </div>
          <McqCard
            question={mcqs[qIndex].question}
            choices={mcqs[qIndex].choices}
            selected={selected}
            onSelect={setSelected}
            result={result}
            grading={grading}
            isLast={qIndex + 1 === mcqs.length}
            onSubmit={submit}
            onNext={next}
            onTryAgain={tryAgain}
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
