import { z } from "zod";

const serverSchema = z.object({
  LLM_MODEL: z.string().min(1).default("glm-5.2:cloud"),
  FAST_MODEL: z.string().min(1).default("deepseek-v4-flash"),
  VISION_MODEL: z.string().min(1).default("qwen3-vl:235b-cloud"),
  EMBED_MODEL: z.string().min(1).default("embeddinggemma"),
  EVAL_MODEL: z.string().min(1).default("glm-5.2:cloud"),
  OLLAMA_API_KEY: z.string().min(1),
  OLLAMA_BASE_URL: z.string().url().default("https://ollama.com"),
  // Required only by the agent runtime (checkpointer) / admin client; validated
  // at the point of use so model + API features work without them.
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  SUPABASE_SECRET_KEY: z.string().optional(),
});

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
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
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!parsed.success) {
    throw new Error(`Invalid public env:\n${parsed.error.toString()}`);
  }
  cachedPublicEnv = parsed.data;
  return cachedPublicEnv;
}
