# Memory Strategy Upgrade (Summary + Window) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 AgentNexus 新增 Summary + Window 混合记忆策略，让长对话通过 LLM 自动压缩旧消息为摘要，避免上下文丢失。

**Architecture:** conversations 表新增 summary/summaryUpTo 字段存储增量摘要；agents 表新增 memoryStrategy 字段让用户选择策略；对话 API 在组装上下文时注入摘要，在回复完成后异步触发摘要更新。核心摘要逻辑独立在 `src/lib/memory/summary.ts`。

**Tech Stack:** Next.js 15, TypeScript, Drizzle ORM (MySQL), Vercel AI SDK v4 (generateText), React 19, next-intl

**Spec:** `docs/superpowers/specs/2026-07-31-memory-strategy-upgrade-design.md`

---

## Task 1: 数据库 Schema 变更

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1: 修改 conversations 表，新增 summary 和 summaryUpTo 字段**

在 `src/db/schema.ts` 的 `conversations` 表定义中，`updatedAt` 字段之后新增：

```typescript
  summary: text("summary"),
  summaryUpTo: varchar("summary_up_to", { length: 36 }),
```

- [ ] **Step 2: 修改 agents 表，新增 memoryStrategy 字段**

在 `src/db/schema.ts` 的 `agents` 表定义中，`memoryWindowSize` 字段之后新增：

```typescript
  memoryStrategy: mysqlEnum("memory_strategy", ["window", "summary_window"]).notNull().default("window"),
```

- [ ] **Step 3: 执行数据库迁移**

```bash
cd /Users/feng/work/AgentNexus && DATABASE_URL="mysql://root:Fengweihui1998%21@127.0.0.1:3306/agentnexus" npx tsx -e "
const { pool } = require('./src/db');
async function main() {
  const conn = await pool.getConnection();
  try {
    // conversations 表
    const [convCols] = await conn.query('SHOW COLUMNS FROM conversations');
    const convColNames = convCols.map(c => c.Field);
    if (!convColNames.includes('summary')) {
      await conn.query('ALTER TABLE conversations ADD COLUMN summary text DEFAULT NULL');
      console.log('Added conversations.summary');
    }
    if (!convColNames.includes('summary_up_to')) {
      await conn.query('ALTER TABLE conversations ADD COLUMN summary_up_to varchar(36) DEFAULT NULL');
      console.log('Added conversations.summary_up_to');
    }
    // agents 表
    const [agentCols] = await conn.query('SHOW COLUMNS FROM agents');
    const agentColNames = agentCols.map(c => c.Field);
    if (!agentColNames.includes('memory_strategy')) {
      await conn.query(\"ALTER TABLE agents ADD COLUMN memory_strategy enum('window','summary_window') NOT NULL DEFAULT 'window'\");
      console.log('Added agents.memory_strategy');
    }
    console.log('Migration complete!');
  } finally {
    conn.release();
    await pool.end();
  }
}
main();
"
```

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat(db): add memory strategy fields to agents and conversations tables"
```

---

## Task 2: 类型和验证更新

**Files:**
- Modify: `src/types/agent.ts`
- Modify: `src/lib/validation/agent.ts`

- [ ] **Step 1: 更新 Agent 类型**

在 `src/types/agent.ts` 的 `Agent` 类型中，`memoryWindowSize` 之后新增：

```typescript
  memoryStrategy: "window" | "summary_window";
```

在 `AgentFormValues` 类型中同样新增：

```typescript
  memoryStrategy: "window" | "summary_window";
```

- [ ] **Step 2: 更新 Zod 验证 schema**

在 `src/lib/validation/agent.ts` 的 `agentInputSchema` 中，`memoryWindowSize` 之后新增：

```typescript
  memoryStrategy: z.enum(["window", "summary_window"]).default("window"),
```

- [ ] **Step 3: Commit**

```bash
git add src/types/agent.ts src/lib/validation/agent.ts
git commit -m "feat(types): add memoryStrategy to Agent type and validation schema"
```

---

## Task 3: 摘要生成核心逻辑

**Files:**
- Create: `src/lib/memory/summary.ts`

- [ ] **Step 1: 创建摘要生成模块**

```typescript
// src/lib/memory/summary.ts
import { generateText } from "ai";
import type { ProviderConfig } from "@/lib/ai/provider";
import { createModelClient } from "@/lib/ai/provider-factory";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

type MessageForSummary = {
  id: string;
  role: string;
  content: string;
};

function buildSummaryPrompt(existingSummary: string | null, newMessages: MessageForSummary[]): string {
  const messagesText = newMessages
    .map((m) => `${m.role}: ${m.content.slice(0, 2000)}`)
    .join("\n\n");

  return [
    "你是一个对话摘要助手。请将以下对话历史压缩为简洁的摘要，保留关键信息：",
    "- 用户的核心需求和意图",
    "- 重要的决策和结论",
    "- 关键的数据和事实",
    "- 待办事项和未完成的工作",
    "",
    existingSummary ? `已有的历史摘要：\n${existingSummary}\n` : "",
    "需要压缩的新对话内容：",
    messagesText,
    "",
    "请输出更新后的完整摘要（保持简洁，不超过 500 字）：",
  ].filter(Boolean).join("\n");
}

export async function updateConversationSummary(
  conversationId: string,
  windowSize: number,
  provider: ProviderConfig,
): Promise<void> {
  const [conversation] = await db
    .select({ summary: conversations.summary, summaryUpTo: conversations.summaryUpTo })
    .from(conversations)
    .where(eq(conversations.id, conversationId));

  if (!conversation) return;

  const allMessages = await db
    .select({ id: messages.id, role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  if (allMessages.length <= windowSize) return;

  // 最近 N 条保留原文
  const recentMessages = allMessages.slice(-windowSize);
  const cutoffIndex = allMessages.length - windowSize;

  // 找出需要新压缩的消息（summaryUpTo 之后 ~ 窗口之前）
  let startIndex = 0;
  if (conversation.summaryUpTo) {
    const idx = allMessages.findIndex((m) => m.id === conversation.summaryUpTo);
    if (idx >= 0) startIndex = idx + 1;
  }

  const newMessagesToCompress = allMessages.slice(startIndex, cutoffIndex);
  if (newMessagesToCompress.length < 4) return; // 不足 4 条不压缩

  const prompt = buildSummaryPrompt(conversation.summary, newMessagesToCompress);

  try {
    const result = await generateText({
      model: createModelClient(provider),
      messages: [{ role: "user", content: prompt }],
      maxTokens: 1000,
      temperature: 0.3,
    });

    const newSummary = result.text.trim();
    if (newSummary) {
      const lastCompressedId = newMessagesToCompress[newMessagesToCompress.length - 1].id;
      await db
        .update(conversations)
        .set({ summary: newSummary, summaryUpTo: lastCompressedId, updatedAt: new Date() })
        .where(eq(conversations.id, conversationId));
    }
  } catch (err) {
    console.error("[memory] Summary generation failed:", err instanceof Error ? err.message : err);
  }
}

export function buildSummarySystemMessage(summary: string): string {
  return `以下是之前对话的摘要，请在回复时参考这些上下文：\n\n${summary}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/memory/summary.ts
git commit -m "feat(memory): add conversation summary generation module"
```

---

## Task 4: 对话 API 集成

**Files:**
- Modify: `src/app/api/conversations/[id]/messages/route.ts`

- [ ] **Step 1: 新增 import**

在文件顶部 import 区域新增：

```typescript
import { updateConversationSummary, buildSummarySystemMessage } from "@/lib/memory/summary";
```

- [ ] **Step 2: 上下文组装时注入摘要**

在对话 API 中，找到以下代码块：

```typescript
  const history = await listMessages(id);
  const windowSize = agent.memoryWindowSize ?? 20;
  const trimmedHistory = windowSize > 0 ? history.slice(-windowSize) : history;
  const chatMessages: ChatMessage[] = [
    ...(agent.systemPrompt ? [{ role: "system" as const, content: agent.systemPrompt }] : []),
    ...trimmedHistory.map((m) => ({ role: m.role, content: m.content })),
  ];
```

替换为：

```typescript
  const history = await listMessages(id);
  const windowSize = agent.memoryWindowSize ?? 20;
  const trimmedHistory = windowSize > 0 ? history.slice(-windowSize) : history;
  const chatMessages: ChatMessage[] = [
    ...(agent.systemPrompt ? [{ role: "system" as const, content: agent.systemPrompt }] : []),
    ...trimmedHistory.map((m) => ({ role: m.role, content: m.content })),
  ];

  // Summary + Window 策略：注入对话摘要
  if (agent.memoryStrategy === "summary_window" && conversation.summary) {
    const summaryMsg = { role: "system" as const, content: buildSummarySystemMessage(conversation.summary) };
    // 插入在 system prompt 之后、用户消息之前
    if (chatMessages.length > 0 && chatMessages[0].role === "system") {
      chatMessages.splice(1, 0, summaryMsg);
    } else {
      chatMessages.unshift(summaryMsg);
    }
  }
```

- [ ] **Step 3: 回复完成后异步触发摘要更新**

在 `onFinish` 回调的 `appendAssistantMessage(...).then(() => undefined)` 之后（return 语句之前），新增异步摘要更新：

将现有的：
```typescript
      return appendAssistantMessage(id, meta.text, {
        ...
      }).then(() => undefined);
```

替换为：
```typescript
      return appendAssistantMessage(id, meta.text, {
        model: providerConfig.model,
        promptTokens: meta.usage?.promptTokens,
        completionTokens: meta.usage?.completionTokens,
        totalTokens: meta.usage?.totalTokens,
        durationMs,
        toolCalls: enrichedToolCalls.length > 0 ? enrichedToolCalls : null,
        activeSkills,
      }).then(() => {
        // 异步触发摘要更新（不阻塞响应）
        if (agent.memoryStrategy === "summary_window") {
          const totalCount = history.length + 2; // +2 for new user + assistant messages
          if (totalCount > (agent.memoryWindowSize ?? 20) + 4) {
            updateConversationSummary(id, agent.memoryWindowSize ?? 20, providerConfig)
              .catch((err) => console.error("[memory] async summary failed:", err));
          }
        }
      }).then(() => undefined);
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/conversations/[id]/messages/route.ts
git commit -m "feat(chat): integrate Summary+Window memory strategy into conversation API"
```

---

## Task 5: 前端 Agent 表单更新

**Files:**
- Modify: `src/components/agents/agent-form.tsx`
- Modify: `messages/en.json`
- Modify: `messages/zh-CN.json`

- [ ] **Step 1: 在 agent-form.tsx 中新增 memoryStrategy 字段**

在 `agent-form.tsx` 中：

1. 在 `toFormValues` 函数中新增：
```typescript
    memoryStrategy: agent?.memoryStrategy ?? "window",
```

2. 在表单 JSX 中，找到 `memoryWindowSize` 输入框区域（`<Label htmlFor="memoryWindowSize">` 附近），在其下方新增：

```tsx
          <div className="space-y-2">
            <Label>{t("memoryStrategy")}</Label>
            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="memoryStrategy"
                  value="window"
                  checked={values.memoryStrategy === "window"}
                  onChange={() => update("memoryStrategy", "window")}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-medium">{t("memoryStrategyWindow")}</p>
                  <p className="text-xs text-muted-foreground">{t("memoryStrategyWindowHint")}</p>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="memoryStrategy"
                  value="summary_window"
                  checked={values.memoryStrategy === "summary_window"}
                  onChange={() => update("memoryStrategy", "summary_window")}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-medium">{t("memoryStrategySummary")}</p>
                  <p className="text-xs text-muted-foreground">{t("memoryStrategySummaryHint")}</p>
                </div>
              </label>
            </div>
          </div>
```

- [ ] **Step 2: 新增 i18n key**

在 `messages/en.json` 的 `agents` 或 `agentsExt.form` 命名空间（与 `memoryWindowSize` 同级）中新增：

```json
"memoryStrategy": "Memory Strategy",
"memoryStrategyWindow": "Sliding Window",
"memoryStrategyWindowHint": "Keep recent N messages only, discard older ones",
"memoryStrategySummary": "Summary + Window",
"memoryStrategySummaryHint": "Auto-compress old messages into summary, preserving key context. Uses extra tokens for summarization."
```

在 `messages/zh-CN.json` 对应位置新增：

```json
"memoryStrategy": "记忆策略",
"memoryStrategyWindow": "滑动窗口",
"memoryStrategyWindowHint": "保留最近 N 条消息，更早的直接丢弃",
"memoryStrategySummary": "摘要 + 窗口",
"memoryStrategySummaryHint": "自动压缩旧消息为摘要，保留关键上下文。会额外消耗少量 token 用于生成摘要。"
```

- [ ] **Step 3: Commit**

```bash
git add src/components/agents/agent-form.tsx messages/en.json messages/zh-CN.json
git commit -m "feat(ui): add memory strategy selector to Agent form"
```

---

## Task 6: 对话界面摘要展示（可选）

**Files:**
- Create: `src/components/chat/conversation-summary.tsx`
- Modify: `src/components/chat/message-list.tsx` (或对话页面组件)

- [ ] **Step 1: 创建摘要展示组件**

```typescript
// src/components/chat/conversation-summary.tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Brain } from "lucide-react";

export function ConversationSummary({ summary }: { summary: string | null }) {
  const [expanded, setExpanded] = useState(false);

  if (!summary) return null;

  return (
    <div className="mx-4 mb-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Brain className="h-3 w-3" />
        <span>对话记忆摘要</span>
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {expanded && (
        <div className="mt-2 p-3 rounded-md bg-muted/50 text-xs text-muted-foreground whitespace-pre-wrap border">
          {summary}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 在对话页面中集成**

在消息列表上方（加载对话数据时如果 conversation.summary 存在），渲染 `<ConversationSummary summary={conversation.summary} />`。

具体集成位置取决于对话页面的结构。需要在获取 conversation 数据的 hook 或 API 中返回 summary 字段，然后在 UI 中渲染。

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/conversation-summary.tsx
git commit -m "feat(chat): add expandable conversation summary display component"
```

---

## 完成检查

1. 在 Agent 编辑页面切换记忆策略为"摘要 + 窗口"
2. 与该 Agent 进行多轮对话（超过 memoryWindowSize + 4 条）
3. 检查 conversations 表中 summary 字段是否被填充
4. 开始新一轮对话，验证 AI 能回忆起旧的上下文
5. 切回"滑动窗口"策略，确认行为不变（纯截断）
