import type { LessonStatus, Objective } from "@/types/lesson";

export type WorkspaceTab = "quiz" | "plan" | "source" | "progress";

export interface WorkspaceLesson {
  id: string;
  title: string;
  subject: string | null;
  sourceFilename: string | null;
  pages: number | null;
  status: LessonStatus;
}

export interface ObjectiveProgress {
  total: number;
  correct: number;
  firstTry: number;
}

export type ProgressMap = Record<string, ObjectiveProgress>;

export interface WorkspacePage {
  pageNo: number;
  text: string;
}

export type WorkspaceObjective = Objective;
