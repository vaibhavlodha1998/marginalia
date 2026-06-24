export type LessonStatus =
  | "parsing"
  | "plan_pending"
  | "in_progress"
  | "complete";

export interface Lesson {
  id: string;
  title: string;
  subject: string | null;
  sourcePdfPath: string | null;
  pages: number | null;
  status: LessonStatus;
  createdAt: string;
}

export type Difficulty = "easy" | "medium" | "hard";
export type ObjectiveStatus = "upcoming" | "current" | "done";

export interface Objective {
  id: string;
  title: string;
  section: string | null;
  difficulty: Difficulty;
  orderIndex: number;
  status: ObjectiveStatus;
  included: boolean;
  plannedMcqCount: number | null;
}
