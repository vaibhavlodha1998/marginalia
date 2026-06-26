export type LessonStatus =
  | "parsing"
  | "plan_pending"
  | "in_progress"
  | "complete";

export interface Lesson {
  id: string;
  title: string;
  subject: string | null;
  sourceFilename: string | null;
  sourcePdfPath: string | null;
  pages: number | null;
  status: LessonStatus;
  createdAt: string;
}

/** Client-safe MCQ — never carries correctIndex / explanation / rationales. */
export interface McqPublic {
  id: string;
  objectiveId: string;
  question: string;
  choices: [string, string, string, string];
  orderIndex: number;
  figureUrl: string | null;
  figurePlacement: "question" | "explanation";
}

export interface GradeResult {
  correct: boolean;
  explanation: string | null;
  choiceRationales: string[] | null;
  hint: string | null;
  attempts: number | null;
}

export interface ReviewAnswer {
  selectedIndex: number;
  correct: boolean;
  explanation: string | null;
  choiceRationales: string[] | null;
  hint: string | null;
  attempts: number;
}

export interface ReviewMcq extends McqPublic {
  review: ReviewAnswer | null;
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
