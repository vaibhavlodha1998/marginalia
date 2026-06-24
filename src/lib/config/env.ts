import { z } from "zod";

const serverSchema = z.object({
  LLM_MODEL: z.string().min(1).default("glm-5.2:cloud"),
  VISION_MODEL: z.string().min(1).default("qwen3-vl:235b-cloud"),
  EMBED_MODEL: z.string().min(1).default("embeddinggemma"),
  OLLAMA_API_KEY: z.string().min(1),
  OLLAMA_BASE_URL: z.string().url().default("https://ollama.com"),
  DATABASE_URL: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type PublicEnv = z.infer<typeof publicSchema>;

let cachedServerEnv: ServerEnv | null = null;
let cachedPublicEnv: PublicEnv | null = null;

// Server-only. Throws if any secret is missing or invalid.
export function serverEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid server env:\n${parsed.error.toString()}`);
  }
  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

export function publicEnv(): PublicEnv {
  if (cachedPublicEnv) return cachedPublicEnv;
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) {
    throw new Error(`Invalid public env:\n${parsed.error.toString()}`);
  }
  cachedPublicEnv = parsed.data;
  return cachedPublicEnv;
}
