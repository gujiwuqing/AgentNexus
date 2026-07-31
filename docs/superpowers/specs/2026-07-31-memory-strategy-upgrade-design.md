# 对话记忆策略升级 — Summary + Window 设计规格

## 概述

为 AgentNexus 升级对话记忆管理策略。当前只有简单的滑动窗口截断（`memoryWindowSize`），超出窗口的旧消息直接丢弃，导致长对话丢失上下文。

新增 **Summary + Window** 混合策略：将窗口外的旧消息用 LLM 压缩为摘要存储，对话时注入 `[摘要] + [最近 N 条原文]`，在有限 token 内最大化保留历史上下文。

参照 Claude Code 的 Session Memory 机制和 Dify 的 Summary + Window 策略设计。

---

## 一、数据层变更

### conversations 表新增字段

```sql
summary       text        NULL    -- 累积的对话摘要
summaryUpTo   varchar(36) NULL    -- 摘要覆盖到的最后一条消息 ID（exclusive）
```

- `summary`：LLM 生成的对话历史摘要文本
- `summaryUpTo`：标记摘要覆盖到哪条消息为止，用于判断哪些消息已被"压缩"，哪些还需要原文保留

### agents 表新增字段

```sql
memoryStrategy  enum("window", "summary_window")  DEFAULT "window"
```

- `window`：纯滑动窗口（现有行为不变）
- `summary_window`：摘要 + 窗口混合策略

---

## 二、核心逻辑

### 2.1 对话上下文组装（查询时）

```
if agent.memoryStrategy === "summary_window" && conversation.summary:
  context = [
    system_prompt + skills + RAG,
    { role: "system", content: "以下是之前对话的摘要：\n" + conversation.summary },
    ...最近 N 条原文消息（N = memoryWindowSize）
  ]
else:
  context = 现有逻辑（纯窗口截断）
```

### 2.2 摘要生成时机

**在 assistant 回复完成后（onFinish 回调中）异步触发**：

```
const totalMessages = await countMessages(conversationId);
const windowSize = agent.memoryWindowSize;

if (agent.memoryStrategy === "summary_window" && totalMessages > windowSize + 4) {
  // 触发摘要更新（异步，不阻塞响应）
  updateConversationSummary(conversationId, agent);
}
```

阈值说明：`windowSize + 4` 表示窗口外至少有 4 条消息时才触发压缩，避免频繁调用 LLM。

### 2.3 摘要生成逻辑（增量更新）

```typescript
async function updateConversationSummary(conversationId: string, agent: Agent) {
  const conversation = await getConversation(conversationId);
  const allMessages = await listMessages(conversationId);
  const windowSize = agent.memoryWindowSize;

  // 需要保留原文的消息（最近 N 条）
  const recentMessages = allMessages.slice(-windowSize);
  const recentFirstId = recentMessages[0]?.id;

  // 已经被摘要覆盖的不需要再处理
  // 需要新压缩的 = summaryUpTo 之后 ~ recentFirstId 之前的消息
  const newMessagesToCompress = getMessagesBetween(allMessages, conversation.summaryUpTo, recentFirstId);

  if (newMessagesToCompress.length === 0) return;

  // 增量压缩：旧摘要 + 新消息 → 新摘要
  const prompt = buildSummaryPrompt(conversation.summary, newMessagesToCompress);
  const newSummary = await generateText(provider, prompt);

  // 更新 conversations 表
  await updateConversation(conversationId, {
    summary: newSummary,
    summaryUpTo: newMessagesToCompress[newMessagesToCompress.length - 1].id,
  });
}
```

### 2.4 摘要生成 Prompt

```
你是一个对话摘要助手。请将以下对话历史压缩为简洁的摘要，保留关键信息：
- 用户的核心需求和意图
- 重要的决策和结论
- 关键的数据和事实
- 待办事项和未完成的工作

{existingSummary ? "已有的历史摘要：\n" + existingSummary + "\n\n" : ""}

需要压缩的新对话内容：
{messages.map(m => `${m.role}: ${m.content}`).join("\n")}

请输出更新后的完整摘要（保持简洁，不超过 500 字）：
```

---

## 三、API/服务层变更

### 3.1 新增文件

- `src/lib/memory/summary.ts` — 摘要生成核心逻辑（`updateConversationSummary`、`buildSummaryPrompt`）

### 3.2 修改文件

- `src/db/schema.ts` — conversations 表新增 `summary`、`summaryUpTo` 字段；agents 表新增 `memoryStrategy` 字段
- `src/app/api/conversations/[id]/messages/route.ts` — 上下文组装时注入摘要；回复完成后异步触发摘要更新
- `src/types/agent.ts` — Agent 类型新增 `memoryStrategy` 字段
- `src/lib/validation/agent.ts` — Zod schema 新增 `memoryStrategy`
- `src/components/agents/agent-form.tsx` — 表单新增记忆策略选择

### 3.3 Validation

```typescript
memoryStrategy: z.enum(["window", "summary_window"]).default("window"),
```

---

## 四、前端变更

### Agent 配置表单

在 `memoryWindowSize` 字段旁边新增 `memoryStrategy` 选择：

```
记忆策略：
  ○ 滑动窗口（默认）— 保留最近 N 条消息，更早的直接丢弃
  ○ 摘要 + 窗口 — 自动压缩旧消息为摘要，保留关键上下文
```

选择 `summary_window` 时，下方显示说明文字："开启后，超出窗口的旧消息会被自动压缩为摘要注入对话，适合长对话场景。会额外消耗少量 token 用于生成摘要。"

### 对话界面（可选展示）

在对话顶部或侧边，当 conversation.summary 存在时，显示一个可展开的"对话摘要"卡片，让用户知道 AI 记住了什么。

---

## 五、不在本期范围

- 跨对话记忆（ChatGPT Dreaming 式的全局记忆系统）
- 记忆重要性评分和遗忘机制
- 向量化记忆检索（MemGPT 式）
- 手动 /compact 命令
- 摘要质量评估和自动修正
