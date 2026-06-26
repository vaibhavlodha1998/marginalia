# Architecture

Marginalia turns a PDF into a structured, interactive lesson: a plan you approve,
a per-objective quiz grounded in the document, a no-spoiler tutor and a
whole-document Q&A, and a final summary. This document explains how it is built
and the decisions behind it.

## Stack

- **Next.js 16** (App Router) on **Vercel**: UI, route handlers, and server
  actions in one deployment.
- **Supabase**: Postgres (app tables + `pgvector` + RLS), Auth (email OTP),
  Storage (PDFs and figure crops).
- **Models** via Ollama cloud (OpenAI-compatible): `glm-5.2` (thinking) for the
  plan, `deepseek-v4-flash` (fast) for authoring, the jury, the tutors, and the
  summary, `minimax-m3` for figure captions.
- **Embeddings**: Gemini `gemini-embedding-001` (768-dim) on serverless, or a
  local Ollama `nomic-embed-text` in dev.
- **unpdf** for serverless-safe PDF text and image extraction; **sharp** to
  encode figure PNGs.

## Request flow

```
Browser
  | upload PDF to Supabase Storage (private bucket, signed)
  v
ingestLesson (server action)
  | unpdf extract text -> pdf_pages
  | after(): fixed-size chunk + embed -> chunks (pgvector)
  | buildFigures (background): unpdf images + sharp + vision caption -> figures
  v
generatePlan (thinking model, claim-locked, title + plan in parallel) -> objectives
  v
PlanReview  ---- HITL: edit difficulty / include-exclude / section toggle ----
  | "Confirm & start" -> approve_plan (atomic RPC) -> lesson in_progress
  v
QuizRunner --- fetch /api/generate (route handler, off the action queue) --->
  generateObjectiveMcqs
    | atomic claim (one run at a time)
    | RAG: embed objective -> match_chunks  (raw pdf_pages fallback)
    | author a batch (fast model) -> 4-evaluator jury (majority vote)
    | insert via service role -> reconcile planned count -> ready
  v
McqCard --- gradeMcq (grade_mcq RPC: answer never leaves the server) --->
  correct: green + explanation + attempts ; wrong: red + progressive hint + retry
  tutor panel: /chat (no-spoiler, scoped) and /doc-chat (whole document)
  v
completeObjective -> next objective ... -> lesson complete -> SummaryScreen
```

## Components

- **Server actions** (`src/app/actions/*`) drive data and most mutations: upload,
  plan, quiz, summary, figures, chat, lessons.
- **Generation runs in a route handler** (`src/app/api/generate/route.ts`), not a
  server action, so its time does not block Next's single server-action queue
  (grading, navigation). The client triggers it with `fetch`.
- **Two streaming tutors** (Vercel AI SDK `streamText`): `api/lessons/[id]/chat`
  (no-spoiler MCQ tutor) and `api/lessons/[id]/doc-chat` (whole-document Q&A).
  One chat UI picks the route based on whether a question is active.
- **RAG** (`src/lib/rag/`): fixed-size chunking, embeddings, the `match_chunks`
  RPC. Authoring and both tutors fall back to raw page text when chunks are
  unavailable.

## Key design decisions

- **No agent framework.** CopilotKit and LangGraph proved unreliable with the
  Ollama models, so the orchestration is explicit server actions and route
  handlers. HITL is a server-action approval gate (`approve_plan`), functionally
  the same as a graph interrupt.
- **Model tiering.** The thinking model is slow (~20 to 40s per call) and only
  the plan benefits from reasoning. Everything else (authoring, jury, tutors,
  summary) uses the fast model. This is the main performance lever.
- **Generation off the action queue.** Next runs server actions one at a time per
  client, so a long generation would queue grading behind it. Moving generation
  to a route handler keeps grading instant.
- **Jury gates on votes, not score.** Four evaluators (grounding, correctness,
  unambiguity, quality) run in parallel; the gate is a majority of pass/fail
  votes, because the fast model returns unreliable numeric scores.
- **Fixed-size chunking.** Semantic chunking embeds every sentence, which is too
  many embedding calls (cost, rate limits) for large documents. Fixed-size
  chunking embeds only the chunks. Semantic chunking is kept in the repo but not
  wired up.
- **Concurrency via atomic claims.** `claim_objective_mcq_gen` (and a plan claim)
  let exactly one run generate; a stale window recovers a dead run; the client
  also treats "all planned questions present" as done, so a stale flag cannot
  trap it.
- **Strict JSON over structured output.** GLM ignores `response_format`, so we
  prompt for JSON and validate with zod (`glmJson`), parsing each item leniently
  so one bad question does not sink the batch.

## Data model

- **lessons** root: `user_id`, `status`, `pages`, `plan_gen_at`.
- **pdf_pages**: `lesson_id`, `page_no`, `text`.
- **chunks**: `lesson_id`, `content`, `page`, `embedding vector(768)` with an HNSW
  index and the `match_chunks` RPC.
- **objectives**: `lesson_id`, `title`, `section`, `difficulty`, `status`,
  `included`, `planned_mcq_count`, `mcq_gen_status` / `mcq_gen_started_at` (claim).
- **mcqs**: `objective_id`, `question`, `choices`, and the answer key
  (`correct_index`, `explanation`, `choice_rationales`) which is column-revoked
  from client roles, plus `hint`, `hints`, `figure_id`, `figure_placement`,
  `eval_status`, `eval_score`.
- **mcq_evaluations**: per-evaluator verdict (audit of the jury).
- **attempts**: `mcq_id`, `user_id`, `selected_index`, `correct`, `attempt_count`.
- **figures**, **chat_messages** (`mcq_id` set for the question tutor, null for the
  document chat), **lesson_summaries**, **generations** (LLM run audit).
- **objective_progress**: a view derived from attempts, so progress is never
  duplicated state.
- **RPCs**: `grade_mcq` (`SECURITY DEFINER`: grades and returns the
  explanation/hint/attempt number, never the index), `match_chunks`,
  `claim_objective_mcq_gen`, `claim_plan_gen`, `approve_plan`.

## Security

- The answer key (`correct_index`, `explanation`, `choice_rationales`) is
  **column-revoked** from client roles; grading goes through `grade_mcq`, so the
  answer never reaches the browser.
- **RLS** on every table, scoped to the owning user through the lesson chain.
- Long generation writes via the **service role**, after the user client has
  verified ownership (the user's token can expire mid-run).
- Both tutors are authenticated, ownership-checked, rate-limited, grounded only in
  the document, and resist prompt injection; the question tutor never receives the
  answer key.

## Known limitations and production roadmap

- **Generation runs in-request** (in a route handler). Production would move it to
  a job queue (Inngest / QStash), with Redis for the rate limiter and the claim.
- **Embeddings on the free tier** cannot index very large PDFs quickly (rate
  limits). A paid embedding tier or a self-hosted embedding endpoint fixes this.
- **Figures on serverless** depend on sharp's native binary; if unavailable they
  are skipped, and the rest of the flow is unaffected.
- **Concept graph and per-user memory** were prototyped then removed for v1 (see
  README Roadmap).
