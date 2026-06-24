import { glmJson } from "@/lib/ollama/json";
import { fastModel } from "@/lib/ollama/models";
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

export async function extractGraph(text: string): Promise<ConceptGraph | null> {
  return glmJson(SYSTEM, `Document:\n\n${text}`, graphSchema, {
    model: fastModel(),
  });
}
