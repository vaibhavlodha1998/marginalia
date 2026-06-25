import { z } from "zod";
import { serverEnv } from "@/lib/config/env";

export const figureCaptionSchema = z.object({
  caption: z.string().min(1),
  type: z.enum(["diagram", "chart", "flowchart", "photo"]).default("diagram"),
  alt: z.string().default(""),
});

export type FigureCaption = z.infer<typeof figureCaptionSchema>;

const PROMPT = `Caption a figure extracted from a document.
Return ONLY JSON: { "caption": "...", "type": "diagram|chart|flowchart|photo", "alt": "..." }.
- caption: one concise sentence describing what the figure shows.
- type: one of diagram, chart, flowchart, photo.
- alt: a short accessibility description.
Ground only in what you can see.`;

export async function captionFigure(
  base64Png: string,
): Promise<FigureCaption | null> {
  const { OLLAMA_API_KEY, OLLAMA_BASE_URL, VISION_MODEL } = serverEnv();
  const res = await fetch(
    `${OLLAMA_BASE_URL.replace(/\/$/, "")}/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OLLAMA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        temperature: 0,
        max_tokens: 280,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              {
                type: "image_url",
                image_url: { url: `data:image/png;base64,${base64Png}` },
              },
            ],
          },
        ],
      }),
    },
  );
  if (!res.ok) return null;

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = json.choices?.[0]?.message?.content ?? "";
  try {
    const cleaned = text.replace(/```json\s*|\s*```/g, "");
    const a = cleaned.indexOf("{");
    const b = cleaned.lastIndexOf("}");
    if (a === -1 || b === -1) return null;
    const parsed = figureCaptionSchema.safeParse(
      JSON.parse(cleaned.slice(a, b + 1)),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
