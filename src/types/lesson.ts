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
