import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { serverEnv } from "@/lib/config/env";

function ollamaConfig() {
  const { OLLAMA_API_KEY, OLLAMA_BASE_URL } = serverEnv();
  return {
    apiKey: OLLAMA_API_KEY,
    configuration: { baseURL: `${OLLAMA_BASE_URL.replace(/\/$/, "")}/v1` },
  };
}

function chat(model: string) {
  return new ChatOpenAI({ model, temperature: 0, ...ollamaConfig() });
}

// Heavy reasoning (planning, MCQ authoring, summary).
export function reasoningModel() {
  return chat(serverEnv().LLM_MODEL);
}

// Lighter/faster tasks (graph + title extraction, hints, quick classification).
export function fastModel() {
  return chat(serverEnv().FAST_MODEL);
}

// MCQ evaluation jury.
export function evalModel() {
  return chat(serverEnv().EVAL_MODEL);
}

// Vision — ingest-only figure extraction.
export function visionModel() {
  return chat(serverEnv().VISION_MODEL);
}

export function embeddings() {
  return new OpenAIEmbeddings({ model: serverEnv().EMBED_MODEL, ...ollamaConfig() });
}
