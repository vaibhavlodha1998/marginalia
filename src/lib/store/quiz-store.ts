import { create } from "zustand";

export interface ActiveQuestion {
  mcqId: string;
  question: string;
  choices: string[];
  objectiveTitle: string;
  figureUrl: string | null;
  figurePlacement: "question" | "explanation";
}

interface QuizStore {
  active: ActiveQuestion | null;
  setActive: (q: ActiveQuestion | null) => void;
}

export const useQuizStore = create<QuizStore>((set) => ({
  active: null,
  setActive: (active) => set({ active }),
}));
