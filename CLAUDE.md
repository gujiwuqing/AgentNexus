# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

AgentNexus — a self-hosted multi-agent orchestration platform. Users create AI Agents (system prompt + model params + memory strategy + optional per-agent provider override), attach reusable Skills (Markdown capability packs) and Custom Tools (HTTP / Prompt / MCP) to them, chat with them (streaming, Markdown, per-message model override, fork/regenerate from any point, debug trace inspection), evaluate them with LLM-judged eval cases, schedule them to run automatically, and build/run visual workflows that chain Agents together with conditional branching, parallelism, loops, human-in-the-loop pauses, and global variables.

Package manager is **pnpm**, not npm — always use `pnpm`.

## Commands

```bash
pnpm run dev              # start Next.js dev server
pnpm test                 # run the full vitest suite
pnpm test -- <pattern>    # run a subset, e.g. pnpm test -- workflow-runs.test
pnpm run db:push          # push src/db/schema.ts to the MySQL dev db (agentnexus) via drizzle-kit push
pnpm run init:all          # one-shot init: account → agents → workflows → knowledge → skills/tools → all associations (idempotent, safe to re-run)
```

There is no configured lint/typecheck script — do not invent one; don't run `next build`/`tsc` unless asked.

Tests share a single MySQL test database (`agentnexus_test`), DROP/CREATE-rebuilt and schema-pushed once at startup by `vitest.setup.ts` via `drizzle-kit push`. Because of this shared database, `vitest.config.ts` sets `fileParallelism: false` — test files run serially, not in parallel workers. Every test file clears all tables in `afterEach` via `clearAllTables()` from `src/db/test-helpers.ts`; don't assume test isolation beyond that.

**Drizzle schema drift gotcha:** `drizzle-kit push` treats `src/db/schema.ts` as the single source of truth. If a column is added to the database via raw SQL (e.g. an ad-hoc migration script) without also adding the matching field to the Drizzle table definition, the next `drizzle-kit push` will silently **drop** that column to "reconcile" with schema.ts. This has happened before (`custom_tools.mcp_config`). Always add the field to `schema.ts` in the same change that adds the column, and run `drizzle-kit push` (not raw `ALTER TABLE`) as the default way to apply schema changes.

## Architecture

### Layering (backend)

Every feature follows the same three-layer stack — don't skip a layer:

1. **`src/app/api/**/route.ts`** — parses the request, validates with a Zod schema from `src/lib/validation/*.ts`, calls the service layer, wraps the result with `apiOk`/`apiError` from `src/lib/api-response.ts`. Route handlers contain no business logic.
2. **`src/server/*.ts`** — one file per resource (`agents.ts`, `conversations.ts`, `messages.ts`, `provider-config.ts`, `workflows.ts`, `workflow-runs.ts`, `skills.ts`, `agent-skills.ts`, `custom-tools.ts`, `agent-custom-tools.ts`, `message-traces.ts`, `evals.ts`, `scheduled-tasks.ts`). Plain async functions that talk to Drizzle directly (`createX`, `getX`, `listX`, `updateX`, `deleteX`). No HTTP concerns here.
3. **`src/db/schema.ts`** — Drizzle table definitions (MySQL, `drizzle-orm/mysql-core`). All FKs use `onDelete: "cascade"`; MySQL 8 InnoDB enforces FKs natively (no PRAGMA needed). Primary keys are `varchar(36)` filled by `createId()` (string ids, not auto-increment — by design). Note: drizzle's MySQL insert/update/delete do **not** support `.returning()` (unlike SQLite/Postgres); server functions use the `createId() → insert with id → get by id` pattern to obtain the created/updated row. Timestamp columns use `fsp: 6` (microsecond precision) so `ORDER BY created_at` is stable for same-second inserts.

Route handler tests import the route's `GET`/`POST`/etc. functions directly and call them with a constructed `Request` — no server needs to be running.

### Three data domains

- **Agent/Conversation/Message** — the chat side. An Agent's own `providerOverride` wins over the global `AiProviderConfig` row (see `resolveProviderConfig` in `src/lib/ai/provider.ts`); a per-message `modelOverride` in the request body wins over both. Chat responses stream via `src/lib/ai/chat.ts`'s `streamAgentReply` (Vercel AI SDK `streamText`). Each assistant message can carry a sibling row in `message_traces` (`src/server/message-traces.ts`) recording the exact system prompt sent, injected Skills, available Tool names, RAG context, the conversation summary if used, model, token breakdown, and latency — this is what the chat UI's "debug" (`Bug` icon) panel reads (`src/components/chat/trace-panel.tsx`). Conversations can be forked from any historical assistant message (not just the last one) via `POST /api/conversations/[id]/fork`, which bulk-deletes everything after a given message and lets the frontend re-stream from there (`regenerateFrom` in `src/hooks/use-chat-stream.ts`) — this is distinct from `regenerate` (last message only) and `editAndResend` (edit + resend, per-message DELETE calls).
- **Skill/Tool** — the capability side, both many-to-many with Agent via `agent_skills` / `agent_custom_tools` join tables. A **Skill** (`src/db/schema.ts`'s `skills` table) is a full Markdown document (the `content` field — not a structured instructions/examples/recommendedTools split, which was tried and rejected as too agent-like; see git history) that gets appended verbatim to the Agent's system prompt when attached (`buildSkillSystemPrompt` in `src/lib/skills/prompt-builder.ts`). A **Tool** (`custom_tools` table) has one of three `type`s — `http` (calls an external URL with `{{param}}` template interpolation), `prompt` (returns an instruction string for the LLM to act on, no external call), or `mcp` (proxies to an MCP server's `/tools/call` endpoint, see `src/lib/tools/mcp-client.ts`) — resolved into Vercel AI SDK `CoreTool`s by `resolveCustomTools` in `src/lib/tools/custom-resolve.ts`, which `resolveAgentTools` (`src/lib/tools/resolve.ts`) merges alongside built-in tools and team-delegation tools. Both Skills and Tools support JSON export/import (`GET /api/skills/[id]/export`, `POST /api/skills/import`, and the `custom-tools` equivalents) — **export filenames must use RFC 5987 `filename*=UTF-8''...` encoding**, not a plain `filename="..."` parameter, because Skill names are free-form Unicode (e.g. Chinese) and a non-ASCII byte in a bare `Content-Disposition` filename makes browsers render the response inline instead of downloading it (see the fix commit if this regresses).
- **Workflow/WorkflowRun/WorkflowStepLog** — the orchestration side. A `Workflow.graph` is a JSON blob (`{ nodes, edges, variables? }`, typed in `src/types/workflow.ts`) with eight node types: `agent`, `condition`, `transform`, `human_input`, `http_request`, `code_execute`, `delay`, `variable_aggregate`. `graph.variables` (`WorkflowVariable[]`) declares global variables with default values, seeded into the execution context at the start of a run. Individual nodes can carry `inputMapping`/`outputMapping` (`Record<string, string>`, templates like `{{global.varName}}` or `{{nodeId}}`) which the engine resolves via `interpolateVariables`/`resolveInputMapping`/`applyOutputMapping` in `src/lib/workflow/engine.ts` — input mapping writes shadow keys (`${nodeId}.input.${key}`) into context before a node runs, output mapping writes into `context[varName]` (stripping the `global.` prefix) after. This is additive/optional — nodes with no mapping behave exactly as before. Workflow node execution calls Agents **non-streamed** via `generateAgentReply` in `src/lib/ai/generate.ts` (a separate function from the chat path's streaming call — don't conflate them).

### Memory strategy

`agents.memoryStrategy` is `"window"` (default) or `"summary_window"`. Both start from the same slice-the-last-N-messages logic in the conversation route (`memoryWindowSize`, default 20). Under `summary_window`, once total message count exceeds `memoryWindowSize + 4`, an async (non-blocking) call to `updateConversationSummary` in `src/lib/memory/summary.ts` fires after the response is persisted: it takes messages between `conversations.summaryUpTo` (exclusive) and the current window boundary, asks the LLM to fold them into (or extend) `conversations.summary`, and advances `summaryUpTo` to the last compressed message's id. On the next turn, if a summary exists, `buildSummarySystemMessage` injects it as an extra system message ahead of the raw windowed messages. This is incremental — it never re-summarizes what's already folded in — and best-effort — a failed summary call is caught and logged, never blocks or fails the chat response.

### Workflow execution engine

`src/lib/workflow/engine.ts`'s `executeWorkflow(graph, input, callbacks, options)` is a pure function with no DB/IO of its own — it takes an `EngineCallbacks` object (`callAgent`, `onStepStart`, `onStepComplete`, `onStepFail`, `onRunUpdate`) and calls back into it. This is deliberate dependency injection: `engine.test.ts` tests graph-traversal logic (serial/parallel/condition/loop/pause-resume) against mock callbacks with zero DB involved, while `src/server/workflow-runs.ts`'s `makeCallbacks()` is the only place that wires the engine to Drizzle and to `generateAgentReply`. When changing execution semantics, edit `engine.ts`; when changing how runs/logs are persisted, edit `workflow-runs.ts` — don't blur the two.

Key traversal facts worth knowing before touching this file: nodes with no incoming edge are treated as start nodes, *except* nodes only reachable via a `condition` node's `trueBranch`/`falseBranch` (those are looked up by node ID, not by graph edges) — `findStartNodes()` special-cases this. Loops re-execute a node by deleting its prior `context[nodeId]` entry once its dependencies are satisfied again; `maxIterations` (default 50) bounds this per node. `onStepFail` is invoked from a `try/catch` wrapped around the whole per-node switch in `executeNode`, so any thrown error (agent-not-found, bad JSON, etc.) is reported against that specific node before propagating to fail the run. Step-log lookups in `workflow-runs.ts` filter by `(runId, nodeId, status: "running")`, not "most recently inserted" — with parallel nodes, multiple rows can share the same (second-precision) `startedAt`, so ordering alone is not a reliable way to find "the log for this node." Global-variable defaults are seeded into `context` once at the top of `executeWorkflow`, before dependency resolution begins, so a node executing on the very first tick can already read `{{global.someVar}}`.

### Evals

An eval case (`eval_cases` table, `src/server/evals.ts`) pairs a test `input` with a natural-language `criteria` (and an optional `expectedOutput` for reference). Running a case (`runEvalCase` in `src/lib/evals/runner.ts`) does two LLM calls: first generates the Agent's actual reply using its real system prompt + attached Skills (via `getAgentSkills`/`buildSkillSystemPrompt`, mirroring what the chat path does, though evals currently skip Tools/RAG), then asks the same provider to act as a judge and return strict `{"score": 0-1, "feedback": "..."}` JSON. Judge output is parsed defensively — malformed JSON falls back to `score: 0.5` with the raw judge text as feedback, rather than throwing. Each run is persisted as a row in `eval_runs`, so a case's history accumulates rather than being overwritten.

### Scheduler

`src/lib/scheduler/worker.ts` runs a `setInterval` inside the Next.js process (started from `src/instrumentation.ts`, guarded by `NEXT_RUNTIME === "nodejs"` and non-test env — same pattern as the workflow worker) that polls `scheduled_tasks` for rows where `enabled` and `nextRunAt <= now`. `cronExpression` is **not** real cron syntax — it's a hand-rolled mini-format (`every Nm`, `every Nh`, or `HH:MM`) parsed by `getNextCronTime` in `src/server/scheduled-tasks.ts`; don't pass a real 5-field cron string and expect it to work. Due tasks dispatch by `type`: `agent_chat` creates a conversation and appends a user message (note: this does **not** itself trigger an AI reply — see the code comment in `worker.ts` for the current limitation), `workflow_run` calls `enqueueWorkflowRun`. Both success and failure paths call `markTaskRun` to advance `nextRunAt`, so a persistently failing task doesn't spin — it just retries on its next scheduled tick instead of immediately.

### Frontend routing

- `/chat` — the main app: a persistent two-pane layout (`src/app/chat/layout.tsx` + `src/components/chat/app-sidebar.tsx`). Left pane lists Agents (expand for their conversations) and Workflows; right pane renders either a chat thread (`/chat/[agentId]/[conversationId]`) or the workflow editor (`/chat/workflows/[workflowId]`). `/chat/[agentId]` alone (no conversation yet) shows an agent summary with a "start conversation" action.
- `/agents`, `/agents/new`, `/agents/[id]`, `/workflows`, `/workflows/new` — standalone list/create/detail pages, mirrored in structure. Creation always goes through a real form (name required) rather than a blind default-value POST from the sidebar — the sidebar's "+ New Agent"/"+ New Workflow" buttons are links into these forms, not direct mutations. `/agents/[id]` additionally renders `AgentSkillsConfig`, `AgentCustomToolsConfig`, `AgentKnowledgeConfig`, `AgentTeamConfig` (multi-select attach/detach panels) and `AgentEvals` (eval case CRUD + run) below the main form.
- `/skills`, `/skills/new`, `/skills/[id]` and `/tools`, `/tools/new`, `/tools/[id]` — same list/create/detail pattern. The Skill editor (`src/components/skills/skill-form.tsx`) is a document-editor layout (large Markdown textarea for `content` as the primary surface, metadata in a side rail) — this was a deliberate redesign away from an earlier Agent-like card/form UI, don't regress it back. List and detail pages both expose export (`window.open` on the `/export` GET route) and import (hidden `<input type="file">` posting the downloaded JSON to `/import`) actions.
- `/schedules` — scheduled task CRUD (create dialog + list), no `/new` sub-route; the dialog toggles between `agent_chat` (pick an Agent) and `workflow_run` (paste a workflow id) target types.
- `/settings` — the single global `AiProviderConfig` row (baseUrl/model/apiKey), overridable per-Agent.
- The workflow editor (`src/components/workflow/workflow-editor.tsx`) is keyed by `workflowId` (`<EditorInner key={workflowId}>`) specifically so that switching workflows via the sidebar force-remounts local editor state — Next.js does not remount a page component just because a dynamic route segment's value changed, and this component's graph-hydration logic depends on a fresh mount. A toolbar toggle (`Variable` icon, next to the version-history `History` icon) opens `VariablePanel`, a side panel for editing `graph.variables`; it follows the exact same `show*`-boolean-state + conditional-side-panel pattern as `VersionHistoryPanel`.

### AI SDK version pin

`ai` and `@ai-sdk/openai` are pinned to major v4/v1 (not the current v5 line) because this codebase uses v4's API shape (`maxTokens`, `topP`, `onFinish: ({ text }) => ...`, `.toTextStreamResponse()`). Don't let a routine `pnpm update` bump these without also migrating the call sites in `src/lib/ai/chat.ts` and `src/lib/ai/generate.ts`.

### Styling

Tailwind v3 + shadcn/ui (`components.json`, "new-york" style, components under `src/components/ui/`). Tailwind is deliberately pinned to v3 — `pnpm add tailwindcss` with no version pin will pull v4 and break the PostCSS config and shadcn's CSS-variable theming; see the fix commit history if this regresses. Dark mode via `next-themes` (`class` strategy).

`next.config.ts` sets `outputFileTracingRoot` explicitly — this project's dev machine had a stray lockfile in a parent directory that made Next.js mis-infer the workspace root and intermittently 404 routes; don't remove this without confirming the underlying environment issue is gone.

### Docs

`docs/superpowers/specs/` and `docs/superpowers/plans/` contain the design specs and implementation plans this project was built from, one pair per phase (Phase 1: agents/chat foundation, 1.5: UI polish, 2: workflow engine, 3+4: workflow editor UI + run monitoring, and later additions covering Skills/Tools, memory strategy, and the 2026-07-31 batch of workflow variables / message traces / model override / MCP / import-export / conversation fork / evals / scheduler). Useful for understanding *why* something was built a certain way, but the code itself is the source of truth for current behavior — several bugs have been found and fixed since those docs were written.
