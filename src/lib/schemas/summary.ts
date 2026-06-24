import { z } from "zod";

export const summarySchema = z.object({
  note: z.string().min(1),
  tips: z.array(z.string().min(1)).min(1),
});

export type LessonSummary = z.infer<typeof summarySchema>;
