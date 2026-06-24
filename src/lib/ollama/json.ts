import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { z, type ZodTypeAny } from "zod";
import { chatModel } from "./models";

function extractJson(text: string): unknown {
  const fenced = text.replace(/```json\s*|\s*```/g, "");
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON object in response");
  return JSON.parse(fenced.slice(start, end + 1));
}

function contentToString(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => (c && typeof c === "object" && "text" in c ? String(c.text) : ""))
      .join("");
  }
  return "";
}

export async function glmJson<S extends ZodTypeAny>(
  system: string,
  user: string,
  schema: S,
  retries = 1,
): Promise<z.infer<S> | null> {
  const model = chatModel();
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await model.invoke([
        new SystemMessage(system),
        new HumanMessage(
          attempt === 0
            ? user
            : `${user}\n\nReturn ONLY valid JSON matching the required shape.`,
        ),
      ]);
      const parsed = schema.safeParse(extractJson(contentToString(res.content)));
      if (parsed.success) return parsed.data;
    } catch {
      // retry
    }
  }
  return null;
}
