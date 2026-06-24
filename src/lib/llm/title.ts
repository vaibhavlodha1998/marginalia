import { z } from "zod";
import { glmJson } from "@/lib/ollama/json";
import { fastModel } from "@/lib/ollama/models";

const metaSchema = z.object({
  title: z.string().min(1),
  subject: z.string().min(1),
});

const SYSTEM = `From the start of a document, infer its real title and a short
subject area. Return ONLY JSON: { "title": "...", "subject": "..." }.
- title: the document's actual title (e.g. the paper/chapter name), concise.
- subject: 1-2 word field/category (e.g. "Machine Learning", "Biology").
Do not use the file name; infer from the content.`;

export async function deriveLessonMeta(
  text: string,
): Promise<{ title: string; subject: string } | null> {
  return glmJson(SYSTEM, `Document start:\n\n${text.slice(0, 6000)}`, metaSchema, {
    model: fastModel(),
  });
}
