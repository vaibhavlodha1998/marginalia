# Marginalia — AI Learning Tutor

Turn any PDF into a structured, interactive, quiz-based lesson. Marginalia plans
a learning path from the document, gets your approval on the plan, runs a
per-objective multiple-choice quiz grounded in the source, gives no-spoiler
hints through a tutor chat, surfaces the document's real figures, and ends with
a progress report and personalized study tips.

## What it does

1. **Upload** a PDF → text is extracted, chunked semantically, embedded for
   retrieval, and figures are pulled out in the background.
2. **Plan** — the model drafts sectioned learning objectives from the document.
   Nothing proceeds until you **review and approve** the plan (HITL).
3. **Quiz** — for the current objective, MCQs are authored from the
   **retrieved** source (RAG) and reviewed by a **parallel jury** before you see
   them. Correct → explanation; incorrect → a hint and a no-penalty retry.
4. **Tutor chat** — a streaming, source-grounded tutor that gives hints and
   explanations for the current question and **never reveals the answer**.
5. **Summary** — overall score, per-objective breakdown, and study tips tied to
   your weaker objectives.

## Tech stack

- **Next.js 16** (App Router) + TypeScript + Tailwind v4 — UI, API routes, and
  server actions in one deployment.
- **Supabase** — Postgres (app tables + `pgvector` + RLS), Auth (email OTP),
  Storage (PDFs + figure crops).
- **Models via Ollama:**
  - Cloud (`ollama.com`): `glm-5.2` (MCQ authoring, reasoning), `deepseek-v4-flash`
    (plan, graph, jury, chat, summary), `minimax-m3` (figure captioning).
  - **Local Ollama**: `nomic-embed-text` for embeddings — the cloud has no
    embedding models, so embeddings run locally.
- **pdfjs-dist** (text + image extraction) + **sharp** (encode figure PNGs).
- **Vercel AI SDK** for streaming (plan + tutor chat).

> **Honest note:** `@copilotkit/*` and `deepagents` are in the dependency list
> but **dormant** — the live flows use server actions + the Vercel AI SDK, which
> proved more reliable with the Ollama models. See _Known limitations_.

## Prerequisites

- **Node 22** and **Yarn** (classic / v1).
- A **Supabase** project.
- An **Ollama cloud account** + API key (https://ollama.com).
- A **local Ollama** running with an embedding model:
  ```bash
  ollama pull nomic-embed-text   # 768-dim, matches the schema
  ```
  It must be serving on `http://localhost:11434` while the app runs.
- _(Optional)_ A **Resend** account to send auth emails via custom SMTP.

## Setup

```bash
git clone <your-repo-url> marginalia && cd marginalia
yarn install
cp .env.example .env.local        # then fill in the values (see below)
```

### 1. Supabase project

From **Project Settings**:

- **API keys** → `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  (publishable), `SUPABASE_SECRET_KEY` (secret — server only, bypasses RLS).
- **Database → Connection string**:
  - `DATABASE_URL` = **Transaction** pooler (port 6543, `?pgbouncer=true`).
  - `DIRECT_URL` = **Session** pooler / Direct (port 5432) — used for migrations.

### 2. Apply the database schema

The migrations create all tables, RLS policies, the `grade_mcq`/`match_*` RPCs,
and the private `pdfs` / `figures` Storage buckets.

```bash
yarn db:migrate     # runs supabase/migrations/*.sql in order (needs DIRECT_URL)
```

Or paste each file in `supabase/migrations/` into the Supabase **SQL Editor** in
order (`0001` → `0008`).

### 3. Supabase Auth (email OTP)

- **Authentication → Providers → Email → Email OTP Length** = `6`.
- **Authentication → URL Configuration → Site URL** = `http://localhost:3000`.
- **Custom SMTP** (so codes actually send): **Authentication → Emails → SMTP**,
  e.g. Resend — host `smtp.resend.com`, port `465`, user `resend`, password =
  your Resend API key, sender on a **verified domain**.
- **Email templates** (Magic Link + Confirm signup): include `{{ .Token }}` so
  the 6-digit code shows — see [`supabase/templates/sign-in.html`](supabase/templates/sign-in.html).

### 4. Local Ollama (embeddings)

Install Ollama, then `ollama pull nomic-embed-text` and make sure it's serving on
`http://localhost:11434`. This powers RAG; without it, MCQ grounding falls back
to raw text.

### 5. Run

```bash
yarn dev          # http://localhost:3000
```

## Environment variables

See [`.env.example`](.env.example). Summary:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser Supabase client (RLS) |
| `SUPABASE_SECRET_KEY` | Service role — trusted server writes (MCQ/figure/summary) |
| `DATABASE_URL` / `DIRECT_URL` | Postgres (app pool / migrations) |
| `OLLAMA_API_KEY` / `OLLAMA_BASE_URL` | Ollama cloud (chat + vision) |
| `EMBED_BASE_URL` | Local Ollama for embeddings (`http://localhost:11434`) |
| `LLM_MODEL` | MCQ authoring (reasoning) — `glm-5.2:cloud` |
| `FAST_MODEL` / `EVAL_MODEL` | Plan, graph, jury, chat, summary — `deepseek-v4-flash` |
| `VISION_MODEL` | Figure captioning — `minimax-m3` |
| `EMBED_MODEL` | Local embeddings — `nomic-embed-text` (768-dim, schema-locked) |
| `EVAL_QUORUM` / `EVAL_PASS_THRESHOLD` | MCQ jury gate |
| `RESEND_API_KEY` | Used as the Supabase SMTP password (and future app email) |

> Ollama's $20 plan allows **3 concurrent cloud models**. We use exactly 3
> (`glm-5.2`, `deepseek-v4-flash`, `minimax-m3`); embeddings are local.

## Scripts

| Script | Description |
| --- | --- |
| `yarn dev` | Dev server (Turbopack) |
| `yarn build` / `yarn start` | Production build / serve |
| `yarn typecheck` | `tsc --noEmit` |
| `yarn lint` | ESLint |
| `yarn db:migrate` | Apply all SQL migrations (needs `DIRECT_URL`) |

## Acceptance criteria

| # | Criterion | Status |
| --- | --- | --- |
| 1 | Accepts a PDF upload and parses content | ✅ |
| 2 | Presents a plan (objective list) | ✅ |
| 3 | HITL review of the plan before proceeding | ✅ |
| 4 | MCQs generated from the PDF content | ✅ (RAG-grounded + jury) |
| 5 | MCQ widget with radio selection | ✅ |
| 6 | Correct answer shows an explanation | ✅ |
| 7 | Incorrect shows a hint + no-penalty retry | ✅ |
| 8 | Proceed through all MCQs to completion | ✅ |
| 9 | Summary of results + study tips | ✅ |

## Security

- `correct_index` (and explanation/rationales) are **column-revoked** from client
  roles; grading goes through the `grade_mcq()` `SECURITY DEFINER` RPC, so the
  answer never leaves the server.
- **RLS** on every table, scoped to the owning user.
- Long generation (MCQ/figure/summary) writes via the **service role**, after the
  user client has verified ownership.

## Known limitations

- **Deploy:** embeddings require a **local** Ollama, which won't exist on Vercel.
  A cloud deploy needs a hosted embedding endpoint (or accept text-fallback
  grounding there).
- **CopilotKit + Deep Agents are dormant** — the agent-style flows are server
  actions + the Vercel AI SDK.
- **Figures**: extraction pulls embedded raster images (covers most paper
  figures); a pure-vector diagram with no embedded image may be missed.
- **Generation pre-gen** has no distributed lock (a rare race if you race ahead);
  production would move generation to a job queue.

## Project structure

```
src/
  app/
    actions/            server actions (upload, plan, quiz, summary, figures, auth, lessons)
    api/lessons/[id]/   streaming routes: plan (AI SDK), chat (tutor)
    lessons/[id]/       workspace + plan approval
  components/
    quiz/ plan/ workspace/ summary/ library/ auth/ ui/ providers/ upload/
  lib/
    ollama/  ai/  rag/  mcq/  figures/  graph/  pdf/  llm/
    supabase/  db/  schemas/  config/  store/  utils/
supabase/migrations/    SQL schema, RLS, RPCs, storage
scripts/                db migration runner
```
