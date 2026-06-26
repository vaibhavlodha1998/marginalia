# Marginalia: AI Learning Tutor

Turn any PDF into a structured, interactive, quiz-based lesson. Marginalia plans a
learning path from the document, gets your approval on the plan, runs a
per-objective multiple-choice quiz grounded in the source, gives no-spoiler hints
through a tutor chat, lets you ask the whole document anything, surfaces the
document's figures, and ends with a progress report and personalized study tips.

Live: https://marginalia.klovr.ai

## What it does

1. **Upload** a PDF. Text is extracted, chunked, and embedded for retrieval;
   figures are pulled out in the background.
2. **Plan.** A thinking model drafts sectioned learning objectives from the
   document. Nothing proceeds until you review and approve the plan (HITL).
3. **Quiz.** For each objective, MCQs are authored from the retrieved source (RAG)
   and vetted by a parallel jury before you see them. Correct shows a full
   explanation; incorrect shows a progressive hint and a no-penalty retry; the
   card also shows how many tries it took.
4. **Two tutors, one chat panel.** On a question, a no-spoiler tutor teaches the
   concept without revealing the answer. On the Source tab, a separate document
   Q&A agent answers from the whole PDF.
5. **Summary.** Overall score, per-objective breakdown, and study tips tied to
   your weaker objectives.

## Tech stack

- **Next.js 16** (App Router) + TypeScript + Tailwind v4. UI, route handlers, and
  server actions in one deployment.
- **Supabase.** Postgres (app tables + `pgvector` + RLS), Auth (email OTP),
  Storage (PDFs + figure crops).
- **Models** (OpenAI-compatible, via Ollama cloud by default):
  - `glm-5.2` (thinking): the plan orchestrator, run once per lesson.
  - `deepseek-v4-flash` (fast): MCQ authoring, the jury, both tutors, the summary,
    and title derivation.
  - `minimax-m3` (vision): figure captioning.
- **Embeddings.** Gemini `gemini-embedding-001` (768-dim) when `GOOGLE_API_KEY` is
  set (works on serverless); otherwise a local Ollama `nomic-embed-text`.
- **unpdf** for serverless-safe PDF text and image extraction (no native canvas),
  plus **sharp** to encode figure PNGs.
- **Vercel AI SDK** (`streamText`) for the streaming tutor chats.

> **Architecture note:** the flows use server actions plus route handlers rather
> than an agent framework, which proved more reliable with these models.
> Generation runs in a route handler (`/api/generate`) so its time does not block
> Next's single server-action queue (grading, navigation).

## Prerequisites

- **Node 22** and **Yarn** (classic / v1).
- A **Supabase** project.
- An **Ollama cloud** account + API key (https://ollama.com) for the chat and
  vision models.
- For embeddings, either a **Google AI Studio** API key (recommended, works
  anywhere) or a **local Ollama** with `nomic-embed-text`.
- _(Optional)_ A **Resend** account for auth emails via custom SMTP.

## Setup

```bash
git clone <your-repo-url> marginalia && cd marginalia
yarn install
cp .env.example .env.local        # then fill in the values (see below)
```

### 1. Supabase project

From **Project Settings**:

- **API keys** for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  (publishable), and `SUPABASE_SECRET_KEY` (secret, server only, bypasses RLS).
- **Database connection strings**:
  - `DATABASE_URL` = **Transaction** pooler (port 6543, `?pgbouncer=true`).
  - `DIRECT_URL` = **Session** pooler / Direct (port 5432), used for migrations.

### 2. Apply the database schema

The migrations create all tables, RLS policies, the `grade_mcq` / `match_*` /
`claim_*` RPCs, and the private `pdfs` / `figures` Storage buckets.

```bash
yarn db:migrate     # runs supabase/migrations/*.sql in order (needs DIRECT_URL)
```

The runner tracks applied files in a `schema_migrations` ledger, so each runs
once and is append-only. You can also paste each file in `supabase/migrations/`
into the Supabase **SQL Editor** in order.

### 3. Supabase Auth (email OTP)

- **Authentication, Providers, Email, OTP Length** = `6`.
- **Authentication, URL Configuration, Site URL** = your app URL
  (`http://localhost:3000` locally, your domain in production), and add it to
  **Redirect URLs**. This is what the email links use.
- **Custom SMTP** (so codes send), e.g. Resend: host `smtp.resend.com`, port
  `465`, user `resend`, password = your Resend key, sender on a verified domain.
- **Email template** includes `{{ .Token }}` so the 6-digit code shows; see
  [`supabase/templates/sign-in.html`](supabase/templates/sign-in.html).

### 4. Embeddings

Set `GOOGLE_API_KEY` (Google AI Studio) to use Gemini embeddings, which work
anywhere including Vercel. Or run a local Ollama
(`ollama pull nomic-embed-text`, serving on `http://localhost:11434`). Without
either, grounding falls back to raw document text.

### 5. Run

```bash
yarn dev          # http://localhost:3000
```

## Environment variables

See [`.env.example`](.env.example). Summary:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser Supabase client (RLS) |
| `SUPABASE_SECRET_KEY` | Service role for trusted server writes (generation, figures, summary) |
| `DATABASE_URL` / `DIRECT_URL` | Postgres (app pool / migrations) |
| `OLLAMA_API_KEY` / `OLLAMA_BASE_URL` | Ollama cloud (chat + vision) |
| `LLM_MODEL` | Plan orchestrator (thinking), `glm-5.2:cloud` |
| `FAST_MODEL` / `EVAL_MODEL` | MCQ authoring, jury, tutors, summary, `deepseek-v4-flash` |
| `VISION_MODEL` | Figure captioning, `minimax-m3` |
| `GOOGLE_API_KEY` | Gemini embeddings; leave unset to use local Ollama |
| `GEMINI_EMBED_MODEL` | `gemini-embedding-001` (768-dim, schema-locked) |
| `EMBED_BASE_URL` / `EMBED_MODEL` | Local Ollama embeddings when `GOOGLE_API_KEY` is unset |
| `EVAL_QUORUM` | Jury gate, `majority` (default) or `all` |
| `RESEND_API_KEY` | Supabase SMTP password |

> Ollama's $20 plan allows **3 concurrent cloud models**. The app uses `glm-5.2`
> (plan), `deepseek-v4-flash` (everything else), and `minimax-m3` (vision);
> embeddings are separate (Gemini or local).

## Scripts

| Script | Description |
| --- | --- |
| `yarn dev` | Dev server (Turbopack) |
| `yarn build` / `yarn start` | Production build / serve |
| `yarn typecheck` | `tsc --noEmit` |
| `yarn lint` | ESLint |
| `yarn db:migrate` | Apply all SQL migrations (needs `DIRECT_URL`) |

## v1 features

- PDF upload with serverless-safe text and figure extraction.
- A thinking-model lesson plan with human-in-the-loop approval.
- Per-objective MCQs generated from the document (RAG-grounded), vetted by a
  four-evaluator jury (grounding, correctness, unambiguity, quality).
- An MCQ widget with single-select choices, green/red feedback, a full
  explanation on a correct answer, progressive hints and no-penalty retries on a
  wrong one, and the number of attempts it took.
- Figures attached to the relevant question or explanation when they help.
- A no-spoiler tutor scoped to the current question, and a whole-document Q&A on
  the Source tab.
- A progress report and personalized study tips at the end.
- Responsive across desktop and phone.

## Security

- `correct_index` (and explanation/rationales) are **column-revoked** from client
  roles; grading goes through the `grade_mcq()` `SECURITY DEFINER` RPC, so the
  answer never leaves the server.
- **RLS** on every table, scoped to the owning user.
- Long generation writes via the **service role**, after the user client has
  verified ownership.
- Both tutors are authenticated, ownership-checked, rate-limited, and grounded
  only in the document (no hallucination); the question tutor never receives the
  answer key.

## Known limitations

- **Figures on serverless.** Figure PNG encoding uses `sharp` (native). If its
  Linux binary is unavailable on the host, figures are skipped; the rest of the
  flow is unaffected.
- **No agent framework**, by choice: server actions plus route handlers, not
  CopilotKit or LangGraph.
- **Generation runs in-request** (in a route handler, off the action queue). An
  atomic claim prevents duplicate authoring, but a production build would move
  generation to a job queue.

## Roadmap (v2)

- **Concept graph (ontology):** extract a concept and prerequisite graph at
  ingest and use it to order objectives and tighten grounding. Prototyped in v1,
  then removed to keep the schema lean.
- **Per-user memory:** remember a learner's recurring misconceptions and
  strengths across lessons and feed them into the tutor and study tips.
- **Background generation:** move authoring and the jury to a job queue, with
  Redis for the rate limiter and generation lock.

## Project structure

```
src/
  app/
    actions/            server actions (upload, plan, quiz, summary, figures, auth, chat, lessons)
    api/
      generate/         MCQ generation (route handler, off the action queue)
      lessons/[id]/
        chat/           no-spoiler MCQ tutor (streaming)
        doc-chat/       whole-document Q&A (streaming)
    lessons/[id]/       workspace + plan approval
  components/
    quiz/ plan/ workspace/ summary/ library/ auth/ ui/ providers/ upload/
  lib/
    ollama/  ai/  rag/  mcq/  figures/  pdf/  llm/
    supabase/  db/  schemas/  config/  store/  utils/
supabase/migrations/    SQL schema, RLS, RPCs, storage (ledger-tracked)
scripts/                migration runner, timing bench
```
