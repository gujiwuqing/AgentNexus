# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

AgentNexus — a self-hosted multi-agent orchestration platform. Users create AI Agents (system prompt + model params + optional per-agent provider override), chat with them (streaming, Markdown), and build/run visual workflows that chain Agents together with conditional branching, parallelism, loops, and human-in-the-loop pauses.

Package manager is **pnpm**, not npm — always use `pnpm`.

## Commands

```bash
pnpm run dev              # start Next.js dev server
pnpm test                 # run the full vitest suite
pnpm test -- <pattern>    # run a subset, e.g. pnpm test -- workflow-runs.test
pnpm run db:push          # push src/db/schema.ts to the MySQL dev db (agentnexus) via drizzle-kit push
```

There is no configured lint/typecheck script — do not invent one; don't run `next build`/`tsc` unless asked.

Tests share a single MySQL test database (`agentnexus_test`), DROP/CREATE-rebuilt and schema-pushed once at startup by `vitest.setup.ts` via `drizzle-kit push`. Because of this shared database, `vitest.config.ts` sets `fileParallelism: false` — test files run serially, not in parallel workers. Every test file clears all tables in `afterEach` via `clearAllTables()` from `src/db/test-helpers.ts`; don't assume test isolation beyond that.

## Architecture

### Layering (backend)

Every feature follows the same three-layer stack — don't skip a layer:

1. **`src/app/api/**/route.ts`** — parses the request, validates with a Zod schema from `src/lib/validation/*.ts`, calls the service layer, wraps the result with `apiOk`/`apiError` from `src/lib/api-response.ts`. Route handlers contain no business logic.
2. **`src/server/*.ts`** — one file per resource (`agents.ts`, `conversations.ts`, `messages.ts`, `provider-config.ts`, `workflows.ts`, `workflow-runs.ts`). Plain async functions that talk to Drizzle directly (`createX`, `getX`, `listX`, `updateX`, `deleteX`). No HTTP concerns here.
3. **`src/db/schema.ts`** — Drizzle table definitions (MySQL, `drizzle-orm/mysql-core`). All FKs use `onDelete: "cascade"`; MySQL 8 InnoDB enforces FKs natively (no PRAGMA needed). Primary keys are `varchar(36)` filled by `createId()` (string ids, not auto-increment — by design). Note: drizzle's MySQL insert/update/delete do **not** support `.returning()` (unlike SQLite/Postgres); server functions use the `createId() → insert with id → get by id` pattern to obtain the created/updated row. Timestamp columns use `fsp: 6` (microsecond precision) so `ORDER BY created_at` is stable for same-second inserts.

Route handler tests import the route's `GET`/`POST`/etc. functions directly and call them with a constructed `Request` — no server needs to be running.

### Two data domains

- **Agent/Conversation/Message** — the chat side. An Agent's own `providerOverride` wins over the global `AiProviderConfig` row (see `resolveProviderConfig` in `src/lib/ai/provider.ts`). Chat responses stream via `src/lib/ai/chat.ts`'s `streamAgentReply` (Vercel AI SDK `streamText`).
- **Workflow/WorkflowRun/WorkflowStepLog** — the orchestration side. A `Workflow.graph` is a JSON blob (`{ nodes, edges }`, typed in `src/types/workflow.ts`) with four node types: `agent`, `condition`, `transform`, `human_input`. Workflow node execution calls Agents **non-streamed** via `generateAgentReply` in `src/lib/ai/generate.ts` (a separate function from the chat path's streaming call — don't conflate them).

### Workflow execution engine

`src/lib/workflow/engine.ts`'s `executeWorkflow(graph, input, callbacks, options)` is a pure function with no DB/IO of its own — it takes an `EngineCallbacks` object (`callAgent`, `onStepStart`, `onStepComplete`, `onStepFail`, `onRunUpdate`) and calls back into it. This is deliberate dependency injection: `engine.test.ts` tests graph-traversal logic (serial/parallel/condition/loop/pause-resume) against mock callbacks with zero DB involved, while `src/server/workflow-runs.ts`'s `makeCallbacks()` is the only place that wires the engine to Drizzle and to `generateAgentReply`. When changing execution semantics, edit `engine.ts`; when changing how runs/logs are persisted, edit `workflow-runs.ts` — don't blur the two.

Key traversal facts worth knowing before touching this file: nodes with no incoming edge are treated as start nodes, *except* nodes only reachable via a `condition` node's `trueBranch`/`falseBranch` (those are looked up by node ID, not by graph edges) — `findStartNodes()` special-cases this. Loops re-execute a node by deleting its prior `context[nodeId]` entry once its dependencies are satisfied again; `maxIterations` (default 50) bounds this per node. `onStepFail` is invoked from a `try/catch` wrapped around the whole per-node switch in `executeNode`, so any thrown error (agent-not-found, bad JSON, etc.) is reported against that specific node before propagating to fail the run. Step-log lookups in `workflow-runs.ts` filter by `(runId, nodeId, status: "running")`, not "most recently inserted" — with parallel nodes, multiple rows can share the same (second-precision) `startedAt`, so ordering alone is not a reliable way to find "the log for this node."

### Frontend routing

- `/chat` — the main app: a persistent two-pane layout (`src/app/chat/layout.tsx` + `src/components/chat/app-sidebar.tsx`). Left pane lists Agents (expand for their conversations) and Workflows; right pane renders either a chat thread (`/chat/[agentId]/[conversationId]`) or the workflow editor (`/chat/workflows/[workflowId]`). `/chat/[agentId]` alone (no conversation yet) shows an agent summary with a "start conversation" action.
- `/agents`, `/agents/new`, `/agents/[id]`, `/workflows`, `/workflows/new` — standalone list/create/detail pages, mirrored in structure. Creation always goes through a real form (name required) rather than a blind default-value POST from the sidebar — the sidebar's "+ New Agent"/"+ New Workflow" buttons are links into these forms, not direct mutations.
- `/settings` — the single global `AiProviderConfig` row (baseUrl/model/apiKey), overridable per-Agent.
- The workflow editor (`src/components/workflow/workflow-editor.tsx`) is keyed by `workflowId` (`<EditorInner key={workflowId}>`) specifically so that switching workflows via the sidebar force-remounts local editor state — Next.js does not remount a page component just because a dynamic route segment's value changed, and this component's graph-hydration logic depends on a fresh mount.

### AI SDK version pin

`ai` and `@ai-sdk/openai` are pinned to major v4/v1 (not the current v5 line) because this codebase uses v4's API shape (`maxTokens`, `topP`, `onFinish: ({ text }) => ...`, `.toTextStreamResponse()`). Don't let a routine `pnpm update` bump these without also migrating the call sites in `src/lib/ai/chat.ts` and `src/lib/ai/generate.ts`.

### Styling

Tailwind v3 + shadcn/ui (`components.json`, "new-york" style, components under `src/components/ui/`). Tailwind is deliberately pinned to v3 — `pnpm add tailwindcss` with no version pin will pull v4 and break the PostCSS config and shadcn's CSS-variable theming; see the fix commit history if this regresses. Dark mode via `next-themes` (`class` strategy).

`next.config.ts` sets `outputFileTracingRoot` explicitly — this project's dev machine had a stray lockfile in a parent directory that made Next.js mis-infer the workspace root and intermittently 404 routes; don't remove this without confirming the underlying environment issue is gone.

### Docs

`docs/superpowers/specs/` and `docs/superpowers/plans/` contain the design specs and implementation plans this project was built from, one pair per phase (Phase 1: agents/chat foundation, 1.5: UI polish, 2: workflow engine, 3+4: workflow editor UI + run monitoring). Useful for understanding *why* something was built a certain way, but the code itself is the source of truth for current behavior — several bugs have been found and fixed since those docs were written.
