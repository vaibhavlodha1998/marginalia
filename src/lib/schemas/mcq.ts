import { z } from "zod";

export const mcqSchema = z.object({
  question: z.string().min(1),
  choices: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
  choiceRationales: z.array(z.string()).length(4),
  hint: z.string().min(1),
  figureRef: z.number().int().positive().nullable().optional(),
});

export const mcqSetSchema = z.object({
  mcqs: z.array(mcqSchema).min(1),
});

export type AuthoredMcq = z.infer<typeof mcqSchema>;

export const evaluatorKinds = [
  "grounding",
  "correctness",
  "unambiguous",
  "quality",
] as const;

export type EvaluatorKind = (typeof evaluatorKinds)[number];

export const verdictSchema = z.object({
  passed: z.boolean(),
  score: z.number().min(0).max(1),
  issues: z.array(z.string()).default([]),
});

export const verdictSetSchema = z.object({
  verdicts: z.array(verdictSchema),
});
