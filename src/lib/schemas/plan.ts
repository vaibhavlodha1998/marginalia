import { z } from "zod";

export const difficulty = z.enum(["easy", "medium", "hard"]);

export const plannedObjective = z.object({
  title: z.string().min(1),
  difficulty,
  questionCount: z.number().int().positive().max(10).default(3),
});

export const planSection = z.object({
  title: z.string().min(1),
  objectives: z.array(plannedObjective).min(1),
});

export const planSchema = z.object({
  sections: z.array(planSection).min(1),
});

export type Plan = z.infer<typeof planSchema>;
