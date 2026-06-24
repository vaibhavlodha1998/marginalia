import { QuizRunner } from "@/components/quiz/quiz-runner";
import { SummaryScreen } from "@/components/summary/summary-screen";
import type { ProgressMap, WorkspaceObjective } from "./types";

export function QuizTab({
  lessonId,
  lessonTitle,
  objectives,
  progress,
  selectedObjectiveId,
}: {
  lessonId: string;
  lessonTitle: string;
  objectives: WorkspaceObjective[];
  progress: ProgressMap;
  selectedObjectiveId?: string;
}) {
  const selected = selectedObjectiveId
    ? objectives.find((o) => o.id === selectedObjectiveId)
    : undefined;
  const current = selected ?? objectives.find((o) => o.status !== "done");
  const currentIdx = current ? objectives.indexOf(current) : -1;
  const index = currentIdx >= 0 ? currentIdx + 1 : objectives.length;
  const next = currentIdx >= 0 ? objectives[currentIdx + 1] : undefined;

  if (!current) {
    return (
      <SummaryScreen
        lessonId={lessonId}
        lessonTitle={lessonTitle}
        objectives={objectives}
        progress={progress}
      />
    );
  }

  return (
    <QuizRunner
      key={current.id}
      objectiveId={current.id}
      nextObjectiveId={next?.id}
      title={current.title}
      difficulty={current.difficulty}
      objNum={index}
      objTotal={objectives.length}
    />
  );
}
