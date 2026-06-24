import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { serverEnv } from "@/lib/config/env";

export function ollamaProvider() {
  const { OLLAMA_API_KEY, OLLAMA_BASE_URL } = serverEnv();
  return createOpenAICompatible({
    name: "ollama",
    baseURL: `${OLLAMA_BASE_URL.replace(/\/$/, "")}/v1`,
    apiKey: OLLAMA_API_KEY,
  });
}
