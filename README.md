# Marginalia — AI Learning Tutor

Turn an uploaded PDF into a structured, interactive, quiz-based lesson. The agent
plans a learning path, gets human approval, runs a per-objective MCQ loop with
visual and textual feedback, and ends with a progress report and study tips.

> Status: **boilerplate**. Scaffold + tooling + infra wiring only. Features are
> built phase by phase (see roadmap).

## Tech stack

- **Next.js (App Router)** on Vercel — UI + CopilotKit runtime in one deployment.
- **TypeScript** end to end. **Yarn** for package management.
- **Deep Agents** (`deepagents`, LangGraph) running in-process.
- **CopilotKit** (AG-UI) for the agent ↔ UI bridge and generative UI.
- **Supabase** — Postgres (checkpointer + app tables + pgvector), Auth (RLS), Storage.
- **Ollama** (OpenAI-compatible) for the reasoning, vision, and embedding models.
- **pdfjs-dist** + **sharp** for PDF parsing and figure crops.
- **TanStack Query** (server-state cache) + **Zustand** (client/session state).
- **Server Actions** as the data/mutation layer.

## Getting started

```bash
yarn install
cp .env.example .env.local   # fill in the values
yarn dev
```

Then open http://localhost:3000.

## Scripts

| Script           | Description                       |
| ---------------- | --------------------------------- |
| `yarn dev`       | Start the dev server (Turbopack). |
| `yarn build`     | Production build.                 |
| `yarn start`     | Run the production build.         |
| `yarn lint`      | ESLint.                           |
| `yarn typecheck` | `tsc --noEmit`.                   |
| `yarn format`    | Prettier write.                   |

## Environment variables

See [`.env.example`](./.env.example) for the full list (models, Supabase,
database, and lesson-config knobs).

## Project structure

```
src/
  app/
    api/copilotkit/      CopilotKit runtime endpoint (Deep Agents wired in later)
    actions/             server actions (data + mutations)
  components/
    providers/           TanStack Query + CopilotKit providers
    ui/                  reusable primitives (button, card, …)
    lesson/ quiz/ chat/  feature components
  lib/
    config/              validated env + lesson config
    supabase/            browser / server / admin clients + auth proxy
    db/                  pg pool (pooled connection for serverless)
    ollama/              model factories (chat / vision / embeddings)
    agent/               Deep Agents graph, tools, subagents
    pdf/ graph/          PDF parsing + concept knowledge graph
    store/               Zustand stores
    utils/               helpers
supabase/migrations/     SQL schema + RLS policies
```

## Roadmap (build phases)

0. Scaffold + CopilotKit runtime + Supabase Auth ← **current**
1. PDF upload, parse, store
2. Concept graph extraction (Postgres + pgvector)
3. Planning + `propose_plan` HITL approval
4. `mcq_author` subagent (zod-validated, grounded)
5. `render_mcq` widget + grade loop
6. Chat coexistence (hints, no-spoiler)
7. Figure extraction (vision, crop, `show_figure`)
8. Summary + study tips
9. Persistence polish, RLS, config
10. Optional: skills + deploy

## Acceptance criteria

1. Accepts a PDF upload and parses relevant content.
2. Presents a plan (todo list) for generation.
3. HITL interrupt to review the plan before proceeding.
4. MCQs generated directly from the PDF content.
5. MCQ genUI widget with radio selection.
6. Correct answer shows an explanation.
7. Incorrect answer shows a hint and allows retry without penalty.
8. User can proceed through all MCQs to completion.
9. Summary of results and study tips at the end.
