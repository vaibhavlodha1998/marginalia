import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { serverEnv } from "@/lib/config/env";

// Ollama is OpenAI-compatible, so every model runs through the OpenAI client
// with a custom baseURL + API key.
function ollamaConfig() {
  const { OLLAMA_API_KEY, OLLAMA_BASE_URL } = serverEnv();
  return {
    apiKey: OLLAMA_API_KEY,
    configuration: { baseURL: `${OLLAMA_BASE_URL.replace(/\/$/, "")}/v1` },
  };
}

export function chatModel() {
  return new ChatOpenAI({
    model: serverEnv().LLM_MODEL,
    temperature: 0,
    ...ollamaConfig(),
  });
}

export function visionModel() {
  return new ChatOpenAI({
    model: serverEnv().VISION_MODEL,
    temperature: 0,
    ...ollamaConfig(),
  });
}

export function embeddings() {
  return new OpenAIEmbeddings({
    model: serverEnv().EMBED_MODEL,
    ...ollamaConfig(),
  });
}
