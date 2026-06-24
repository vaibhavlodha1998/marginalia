import { QuizRunner } from "@/components/quiz/quiz-runner";
import type { WorkspaceObjective } from "./types";

export function QuizTab({
  objectives,
}: {
  objectives: WorkspaceObjective[];
}) {
  const current = objectives.find((o) => o.status !== "done");
  const index = current ? objectives.indexOf(current) + 1 : objectives.length;

  if (!current) {
    return (
      <div className="mx-auto max-w-[680px] p-10 text-center max-md:p-6">
        <div className="rounded-2xl border border-border bg-surface p-10">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-[18px] bg-primary text-[30px] text-on-primary">
            ✦
          </div>
          <h2 className="font-serif text-[24px] font-semibold text-ink">
            Lesson complete
          </h2>
          <p className="mx-auto mt-2 max-w-[420px] text-[14.5px] leading-relaxed text-ink-2">
            You worked through every objective. A full summary with study tips is
            coming next.
          </p>
        </div>
      </div>
    );
  }

  return (
    <QuizRunner
      key={current.id}
      objectiveId={current.id}
      title={current.title}
      difficulty={current.difficulty}
      objNum={index}
      objTotal={objectives.length}
    />
  );
}
