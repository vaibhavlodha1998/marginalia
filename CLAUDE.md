@AGENTS.md

# Marginalia project guide

AI learning tutor: PDF to a sectioned plan (HITL approval) to a RAG-grounded,
jury-vetted MCQ quiz, with a no-spoiler tutor per question and a whole-document
Q&A on the Source tab, ending in a summary + study tips. Figures are extracted
and shown in the Source tab and relevant MCQs.

## Commands

- `yarn dev` for the dev server. `yarn build` to verify a real build before claiming done.
- `yarn typecheck` and `yarn lint` must pass before committing.
- `yarn db:migrate` applies `supabase/migrations/*.sql` (needs `DIRECT_URL`).

## Architecture (how it actually works)

- **Server actions** drive data + most mutations (`src/app/actions/*`): upload,
  plan, quiz, summary, figures, auth, chat, lessons.
- **Generation runs in a route handler** (`src/app/api/generate/route.ts`), NOT a
  server action, so its ~20s does not block Next's single server-action queue
  (grading, navigation). The client fires it via `fetch`.
- **Two streaming tutors** (Vercel AI SDK `streamText`): `api/lessons/[id]/chat`
  is the no-spoiler MCQ tutor (gets the question, never the answer key);
  `api/lessons/[id]/doc-chat` answers from the whole document. One chat UI picks
  the route based on whether a question is active.
- **No agent framework.** CopilotKit, Deep Agents, the concept graph, and memory
  were removed for v1 (see README Roadmap).
- **Models** (`src/lib/ollama/models.ts`): `reasoningModel()` = `LLM_MODEL`
  (glm-5.2, thinking) is used ONLY for the plan orchestrator. `fastModel()` =
  `FAST_MODEL` (deepseek-v4-flash) does MCQ authoring, the jury, both tutors, the
  summary, and the title. `visionModel()` = minimax-m3 (figures). Keep cloud
  models ≤ 3 concurrent (Ollama plan limit).
- **Embeddings** (`src/lib/rag/embed.ts`): Gemini `gemini-embedding-001` (768-dim)
  when `GOOGLE_API_KEY` is set (works on serverless), else local Ollama
  `nomic-embed-text` via `EMBED_BASE_URL`. Same vector space must be used to chunk
  and to query a lesson.
- **RAG**: chunking (`src/lib/rag/`) to the `chunks` table (pgvector) to the
  `match_chunks` RPC. Authoring and both tutors fall back to raw `pdf_pages` text
  when chunks/embeddings are unavailable.
- **PDF**: `unpdf` for serverless-safe text + image extraction (no native canvas);
  `sharp` only encodes figure PNGs. `pdfjs-dist` is client-only (the viewer).
- **GLM-5.2 is a thinking model** and ignores `response_format`/structured output.
  We prompt for strict JSON and validate with zod (`glmJson`). Do NOT rely on
  provider-side structured output with Ollama.
- **The jury gates on evaluator votes (majority), not their numeric score** (the
  fast model returns unreliable scores). See `src/lib/mcq/evaluate.ts`.

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
- `yarn db:migrate` tracks applied files in `schema_migrations` and is append-only;
  the early migrations aren't idempotent on their own.
- Storage buckets `pdfs` / `figures` are private; serve via signed URLs.
