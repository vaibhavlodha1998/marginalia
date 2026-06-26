"use client";

import { useState } from "react";
import { LessonRail } from "./lesson-rail";
import { QuizTab } from "./quiz-tab";
import { PlanTab } from "./plan-tab";
import { SourceTab } from "./source-tab";
import { ProgressTab } from "./progress-tab";
import { TutorChat } from "./tutor-chat";
import type {
  ProgressMap,
  WorkspaceFigure,
  WorkspaceLesson,
  WorkspaceObjective,
  WorkspacePage,
  WorkspaceTab,
} from "./types";

export function LessonWorkspace({
  lesson,
  objectives,
  progress,
  pages,
  pdfUrl,
  figures,
}: {
  lesson: WorkspaceLesson;
  objectives: WorkspaceObjective[];
  progress: ProgressMap;
  pages: WorkspacePage[];
  pdfUrl: string | null;
  figures: WorkspaceFigure[];
}) {
  const [tab, setTab] = useState<WorkspaceTab>("quiz");
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string>();

  function selectObjective(id: string) {
    setSelectedObjectiveId(id);
    setTab("quiz");
  }

  // Total is the planned question count (known up front), not the number of
  // questions generated so far — generation is lazy.
  const totals = objectives.reduce(
    (acc, o) => {
      acc.total += o.plannedMcqCount ?? progress[o.id]?.total ?? 0;
      acc.correct += progress[o.id]?.correct ?? 0;
      return acc;
    },
    { correct: 0, total: 0 },
  );

  return (
    <div className="relative flex h-[100dvh] min-w-0 overflow-hidden max-md:flex-col">
      <LessonRail
        lesson={lesson}
        active={tab}
        onTab={setTab}
        correct={totals.correct}
        total={totals.total}
      />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-paper">
        <div className="mg-scroll flex-1 overflow-y-auto">
          {tab === "quiz" && (
            <QuizTab
              lessonId={lesson.id}
              lessonTitle={lesson.title}
              objectives={objectives}
              progress={progress}
              selectedObjectiveId={selectedObjectiveId}
            />
          )}
          {tab === "plan" && (
            <PlanTab objectives={objectives} onSelect={selectObjective} />
          )}
          {tab === "source" && (
            <SourceTab
              lesson={lesson}
              pages={pages}
              pdfUrl={pdfUrl}
              figures={figures}
            />
          )}
          {tab === "progress" && (
            <ProgressTab
              objectives={objectives}
              progress={progress}
              correct={totals.correct}
              total={totals.total}
            />
          )}
        </div>
      </main>

      {(tab === "quiz" || tab === "source") && (
        <TutorChat
          lessonId={lesson.id}
          open={chatOpen}
          onToggle={() => setChatOpen((v) => !v)}
        />
      )}
    </div>
  );
}
