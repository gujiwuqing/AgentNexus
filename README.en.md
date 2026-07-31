<div align="center">

# AgentNexus

**A self-hosted multi-agent orchestration platform**

Create AI agents, chat with them in real time, and chain multiple agents into automated workflows with conditional branching, parallelism, loops, and human-in-the-loop pauses.

<p>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-3-38BDF8?logo=tailwindcss&logoColor=white" />
  <img alt="Drizzle ORM" src="https://img.shields.io/badge/Drizzle_ORM-C5F74F?logo=drizzle&logoColor=black" />
  <img alt="MySQL" src="https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white" />
  <img alt="Vercel AI SDK" src="https://img.shields.io/badge/Vercel_AI_SDK-v4-000000?logo=vercel&logoColor=white" />
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white" />
  <img alt="Vitest" src="https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white" />
</p>

[中文](./README.md) · **English**

</div>

---

## ✨ Features

| Module | Description |
| --- | --- |
| 🤖 **Agents** | Custom system prompts, model params (temperature / maxTokens / topP), memory strategy (sliding window / summary+window), suggested prompts, built-in tool config; each agent can override the global model provider, and any single message can override the model too |
| 💬 **Chat** | Streaming responses, Markdown rendering, file attachments, token-based share links, conversation summary memory, per-message debug trace panel, fork/regenerate from any historical message |
| ⚡ **Skills** | Reusable capability packs authored as Markdown documents (metadata + full instructions); attaching one to an agent injects it into the system prompt. Supports JSON import/export |
| 🔧 **Custom Tools** | User-defined tools with three execution modes — HTTP call, prompt instruction, or MCP protocol — callable in conversation once attached to an agent. Supports JSON import/export |
| 🔀 **Workflows** | React Flow visual editor with 8 node types, global variables plus per-node input/output mapping, version history, an async execution queue, run records, and step-by-step debugging |
| 📚 **Knowledge / RAG** | Document upload, chunking, reindexing, retrieval testing; attachable to agents |
| 🧪 **Evals** | Create evaluation cases for an agent; an LLM judge scores and gives feedback automatically |
| ⏰ **Schedules** | Trigger an agent chat or workflow run automatically on a recurring schedule |
| 📊 **Dashboard** | Usage and conversation statistics |
| 👥 **Multi-user & roles** | Authenticated login and an admin console (user management / site-wide data) |
| 🌍 **i18n** | Built-in English and Simplified Chinese (`next-intl`) |
| 🌓 **Theming** | Light / dark mode toggle (`next-themes`) |

### Workflow node types

`agent` (call an agent), `condition` (conditional branch), `transform` (text processing), `human_input` (wait for human input), `http_request` (call an external API), `code_execute` (code execution), `delay`, and `variable_aggregate`. Nodes can pass data via global variables and input/output mapping (`{{global.varName}}` / `{{nodeId}}`).

---

## 🧱 Tech stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router) + [React 19](https://react.dev/) + TypeScript
- **Styling**: [Tailwind CSS v3](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (new-york style)
- **Data fetching**: [TanStack Query](https://tanstack.com/query)
- **Database**: MySQL 8 + [Drizzle ORM](https://orm.drizzle.team/)
- **AI**: [Vercel AI SDK v4](https://sdk.vercel.ai/) (OpenAI / Anthropic / Azure)
- **Visual editor**: [@xyflow/react](https://reactflow.dev/) (React Flow)
- **Validation**: [Zod](https://zod.dev/)
- **Testing**: [Vitest](https://vitest.dev/)
- **Package manager**: **pnpm** (do not use npm/yarn)

---

## 🚀 Getting started

### Requirements

- Node.js **≥ 20** (22.x in development)
- pnpm
- MySQL **8** (default dev database `agentnexus`, test database `agentnexus_test`)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Copy the example file and edit as needed:

```bash
cp .env.example .env.local
```

Key variables:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Dev database connection string, e.g. `mysql://user:pass@127.0.0.1:3306/agentnexus` |
| `DATABASE_URL_TEST` | Test database connection string (`agentnexus_test`) |
| `WORKFLOW_WORKER_ENABLED` | Whether to start the in-process workflow worker; keep `true` for self-hosted, set `false` for serverless |
| `WORKFLOW_WORKER_CONCURRENCY` | Max concurrent workflow runs (default `2`) |
| `WORKFLOW_WORKER_POLL_MS` | Queue idle polling interval in ms (default `2000`) |
| `WORKFLOW_NODE_TIMEOUT_MS` | Per-node execution timeout in ms (default `300000`) |
| `WORKFLOW_TICK_SECRET` | Shared secret for driving the queue via an external cron; without it `/api/workflow-jobs/tick` returns 404 |

> The AI model provider (baseUrl / model / apiKey) is configured in the app's **Settings** page and can be overridden per agent — no environment variable needed.

### 3. Initialize the database

Create the database in MySQL first, then push the schema:

```bash
pnpm run db:push        # sync src/db/schema.ts to the DB behind DATABASE_URL
```

### 4. Start the dev server

```bash
pnpm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

---

## 📜 Scripts

```bash
pnpm run dev              # start the dev server
pnpm run build            # production build
pnpm run start            # start the production server
pnpm test                 # run the full vitest suite
pnpm test -- <pattern>    # run a subset, e.g. pnpm test -- workflow-runs.test
pnpm run db:push          # push the schema to MySQL
pnpm run templates:reset  # reset to the built-in professional templates
pnpm run prompts:backfill # backfill agent suggested prompts
pnpm run init:all         # one-shot init: account → agents → workflows → knowledge → skills/tools → all associations
```

> Tests share a single MySQL test database (`agentnexus_test`), DROP/CREATE-rebuilt and schema-pushed at startup by `vitest.setup.ts`. Because of this, tests run **serially** (`fileParallelism: false`), and each test clears all tables in `afterEach`.

---

## 🗂️ Project structure

```
src/
├── app/
│   ├── (app)/            # main app after login (chat / agents / skills / tools / workflows / knowledge / schedules / dashboard / settings)
│   ├── (admin)/          # admin console
│   ├── api/**/route.ts   # API route layer (parse request + validate + call service layer only)
│   ├── login/            # login page
│   └── share/[token]/    # conversation share page
├── components/           # UI components (chat / agents / skills / tools / workflow / knowledge / nav / ui ...)
├── server/               # service layer: one file per resource, talks to Drizzle directly
├── db/                   # Drizzle schema & connection
├── lib/                  # ai / workflow engine / memory / evals / scheduler / files / knowledge / validation / tools ...
├── hooks/                # TanStack Query hooks
├── i18n/                 # internationalization config
└── types/                # domain type definitions
messages/                 # translation files (en / zh-CN)
docs/superpowers/         # per-phase design specs and implementation plans
```

### Three-layer backend architecture

Every feature follows the same layering — don't skip a layer:

1. **`src/app/api/**/route.ts`** — parse the request, validate with a Zod schema from `src/lib/validation/*`, call the service layer, and wrap the result with `apiOk` / `apiError`. Route handlers contain no business logic.
2. **`src/server/*.ts`** — one file per resource (`agents.ts`, `conversations.ts`, `workflows.ts`, `workflow-runs.ts`, `skills.ts`, `custom-tools.ts`, `evals.ts`, `scheduled-tasks.ts`, …); plain async functions that talk to Drizzle directly.
3. **`src/db/schema.ts`** — Drizzle table definitions (MySQL). Primary keys are `varchar(36)` generated by `createId()`; all FKs use `onDelete: "cascade"`.

### Three data domains

- **Agent / Conversation / Message** — the chat side. Responses stream via `streamAgentReply` (AI SDK `streamText`). Each message can have an associated debug trace (`message_traces`) recording the full system prompt, injected Skills, available Tools, RAG context, and token breakdown.
- **Skill / Tool** — the capability side. A Skill is a Markdown document injected into the system prompt once attached to an agent; a Tool is one of three executable types (HTTP / Prompt / MCP) callable in conversation once attached. Both are many-to-many with agents, independently manageable, and support import/export.
- **Workflow / WorkflowRun / WorkflowStepLog** — the orchestration side. Workflow nodes call agents **non-streamed** via `generateAgentReply`. `graph.variables` defines global variables; a node's `inputMapping` / `outputMapping` controls variable reads/writes.

### Memory strategy

An agent's `memoryStrategy` supports two modes:

- **`window`** (default): keep only the most recent N messages (`memoryWindowSize`); older ones are simply discarded.
- **`summary_window`**: messages beyond the window are incrementally compressed by an LLM into a summary (stored in `conversations.summary`); each turn injects `[summary] + [most recent N raw messages]` so long conversations don't lose context.

### Workflow execution engine

`executeWorkflow()` in `src/lib/workflow/engine.ts` is a pure function that uses dependency injection through an `EngineCallbacks` object and performs no DB/IO of its own. `makeCallbacks()` in `src/server/workflow-runs.ts` is the only place wiring the engine to Drizzle and the LLM. A workflow may run for minutes, so it does not execute synchronously inside an HTTP request — it is enqueued and consumed by a worker while the frontend polls for progress.

### Scheduler

`src/lib/scheduler/worker.ts` polls the `scheduled_tasks` table on a fixed in-process interval. Due tasks are dispatched by `type`: `agent_chat` creates a conversation and sends a message; `workflow_run` enqueues a workflow execution. After running, the next trigger time is computed from `cronExpression` (a simplified format: `every Nm` / `every Nh` / `HH:MM`).

---

## 🌐 Deployment

- **Self-hosted (`next start`)**: keep `WORKFLOW_WORKER_ENABLED=true`; the in-process worker consumes the workflow queue automatically.
- **Serverless**: set `WORKFLOW_WORKER_ENABLED=false` and configure an external cron to periodically hit the queue-driver endpoint:

  ```bash
  curl -X POST -H "x-workflow-tick-secret: <secret>" https://<host>/api/workflow-jobs/tick
  ```

  This endpoint requires `WORKFLOW_TICK_SECRET`; otherwise it returns 404 to avoid an unauthenticated public execution entry point.

---

## 📖 Docs

`docs/superpowers/specs/` and `docs/superpowers/plans/` hold the per-phase design specs and implementation plans, useful for understanding *why* something was built a certain way. Note that the code itself is the source of truth for current behavior.
