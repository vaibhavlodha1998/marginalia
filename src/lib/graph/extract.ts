import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { chatModel } from "@/lib/ollama/models";
import { graphSchema, type ConceptGraph } from "@/lib/schemas/ontology";

const SYSTEM = `You extract a concept knowledge graph from a document.
Return ONLY a JSON object, no prose, no code fences, of the form:
{
  "concepts": [{ "key": "c1", "type": "Concept", "label": "...", "body": "...", "page": 1 }],
  "edges": [{ "from": "c1", "to": "c2", "type": "prerequisite_of" }]
}
Rules:
- type is one of: Concept, Definition, Example, Formula, Objective, Figure.
- edge type is one of: prerequisite_of, part_of, illustrates, defines, assessed_by.
- "key" is a short unique id you assign; edges reference concepts by key.
- "page" is the page number the concept comes from (integer), or null.
- Extract only what the document actually supports. Keep labels concise; put the
  supporting detail in "body". Aim for the key teachable concepts and their
  prerequisite relationships.`;

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

export async function extractGraph(text: string): Promise<ConceptGraph | null> {
  const model = chatModel();
  const user = `Document:\n\n${text}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await model.invoke([
        new SystemMessage(SYSTEM),
        new HumanMessage(
          attempt === 0
            ? user
            : `${user}\n\nReturn ONLY valid JSON matching the required shape.`,
        ),
      ]);
      const parsed = graphSchema.safeParse(extractJson(contentToString(res.content)));
      if (parsed.success) return parsed.data;
    } catch {
      // fall through to retry
    }
  }
  return null;
}
