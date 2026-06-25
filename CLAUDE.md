@AGENTS.md

# Marginalia — project guide

AI learning tutor: PDF → sectioned plan (HITL approval) → RAG-grounded,
jury-reviewed MCQ quiz with a no-spoiler tutor chat → summary + study tips.
Figures are extracted from the PDF and shown in the Source tab + relevant MCQs.

## Commands

- `yarn dev` — dev server. `yarn build` — verify a real build before claiming done.
- `yarn typecheck` and `yarn lint` — must pass before committing.
- `yarn db:migrate` — apply `supabase/migrations/*.sql` (needs `DIRECT_URL`).

## Architecture (how it actually works)

- **Server actions** drive data + generation (`src/app/actions/*`): upload, plan,
  quiz, summary, figures, auth, lessons. **Streaming** (plan + tutor chat) uses
  the **Vercel AI SDK** via routes under `src/app/api/lessons/[id]/`.
- **CopilotKit + Deep Agents are installed but NOT used** — don't assume they're
  wired. The chat is the AI SDK `streamText` route; the quiz is server actions.
- **Models** (`src/lib/ollama/models.ts`): `reasoningModel()` = `LLM_MODEL`
  (glm-5.2, MCQ authoring), `fastModel()` = `FAST_MODEL` (deepseek-v4-flash,
  everything else), `evalModel()` (jury), `visionModel()` (figures, minimax-m3).
  Keep cloud models ≤ 3 concurrent (Ollama plan limit).
- **Embeddings are LOCAL** (`src/lib/rag/embed.ts` → `EMBED_BASE_URL`, default
  `localhost:11434`, `nomic-embed-text`). Cloud has no embedding models.
- **RAG**: semantic chunking (`src/lib/rag/`) → `chunks` table (pgvector) →
  `match_chunks` RPC grounds MCQ authoring.
- **GLM-5.2 is a thinking model** → slow; it ignores `response_format`/structured
  output. We prompt for strict JSON and validate with zod (`glmJson`). Do NOT
  rely on provider-side structured output with Ollama.

## Security / data rules

- `correct_index`, `explanation`, `choice_rationales` are **column-revoked** from
  client roles. Never select them with the user client. Grading goes through the
  `grade_mcq()` RPC; review feedback is read with the **service-role** client.
- **RLS** everywhere. Long generation (MCQ/figure/summary) writes via the
  **service-role** client (`createAdminClient`) because the user's token can
  expire mid-run — verify ownership with the user client first.

## Conventions (enforced)

- **One component per file.** Extract helpers (cards, rows, stats) to their own file.
- **No `alert` / `confirm` / `prompt` / `dangerouslySetInnerHTML` / `eval`.** Use
  `ConfirmDialog` for destructive actions; render via JSX/`RichText`.
- **Mutations go through server actions**; reads in RSC are fine.
- Keep **comments minimal**. Match surrounding style.
- Render math/markdown with `RichText` (KaTeX) in questions, choices,
  explanations, hints, and objective titles.

## Gotchas

- After mutations, prefer server-side `revalidatePath` + `redirect` over client
  `router.refresh()` (dev Turbopack can stall soft-nav).
- Migrations aren't idempotent (plain `create type/table`) — run on a fresh DB.
- Storage buckets `pdfs` / `figures` are private; serve via signed URLs.
