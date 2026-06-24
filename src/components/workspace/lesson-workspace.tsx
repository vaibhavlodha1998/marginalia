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
}: {
  lesson: WorkspaceLesson;
  objectives: WorkspaceObjective[];
  progress: ProgressMap;
  pages: WorkspacePage[];
}) {
  const [tab, setTab] = useState<WorkspaceTab>("quiz");
  const [chatOpen, setChatOpen] = useState(true);

  const totals = objectives.reduce(
    (acc, o) => {
      const p = progress[o.id];
      if (p) {
        acc.correct += p.correct;
        acc.total += p.total;
      }
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
          {tab === "quiz" && <QuizTab objectives={objectives} />}
          {tab === "plan" && <PlanTab objectives={objectives} />}
          {tab === "source" && <SourceTab lesson={lesson} pages={pages} />}
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

      <TutorChat open={chatOpen} onToggle={() => setChatOpen((v) => !v)} />
    </div>
  );
}
