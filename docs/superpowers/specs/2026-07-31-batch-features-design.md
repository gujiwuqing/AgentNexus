# AgentNexus 批量功能升级 — 设计规格（8 个功能）

## 功能清单

| # | 功能 | 优先级 | 核心改动 |
|---|------|--------|----------|
| 1 | 工作流变量系统增强 | P0 | 全局变量面板、节点输入输出映射 |
| 2 | 运行日志与调试追踪 | P1 | 每条消息的完整 trace（prompt/skill/tool/token） |
| 3 | 对话中切换模型 | P1 | 消息级别覆盖模型，对比重新生成 |
| 4 | MCP 协议兼容 | P2 | Tool 新增 type="mcp"，连接外部 MCP Server |
| 5 | Skill/Tool 导入导出 | P2 | JSON 格式导出/导入分享 |
| 6 | 对话分支（fork） | P2 | 从任意消息处分叉重新生成 |
| 7 | Agent 评测框架 | P2 | 自动化评估 Agent 输出质量 |
| 8 | 定时任务 | P2 | Agent/Workflow 定期自动执行 |

---

## 1. 工作流变量系统增强

### 现状问题
节点间数据传递靠 `context: Record<string, string>` 字典，无类型安全，无可视化变量面板。

### 设计方案

**1.1 全局变量定义**

在 workflow 的 `graph` JSON 中新增 `variables` 字段：

```typescript
graph: {
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  variables: WorkflowVariable[]  // 新增
}

type WorkflowVariable = {
  name: string;           // 变量名
  type: "string" | "number" | "boolean" | "json";
  defaultValue?: string;
  description?: string;
};
```

**1.2 节点输入输出映射**

每个节点配置中新增 `inputMapping` 和 `outputMapping`：

```typescript
// 在节点 data 中
inputMapping?: Record<string, string>;   // { nodeParamName: "{{global.varName}}" 或 "{{node_id.output}}" }
outputMapping?: Record<string, string>;  // { "global.varName": "{{result}}" }
```

**1.3 前端变量面板**

工作流编辑器右侧新增"变量"面板：
- 可增删全局变量
- 显示变量名、类型、当前值（运行时）
- 节点配置弹窗中新增输入/输出映射配置

**1.4 引擎改造**

`src/lib/workflow/engine.ts` 的 `executeWorkflow` 在每个节点执行前解析 `inputMapping` 插值，执行后按 `outputMapping` 写回 context。

### 涉及文件
- Modify: `src/types/workflow.ts` — 新增 WorkflowVariable 类型
- Modify: `src/lib/workflow/engine.ts` — 变量插值和输出映射
- Create: `src/components/workflow/variable-panel.tsx` — 变量面板 UI
- Modify: `src/components/workflow/node-config-dialog.tsx` — 节点映射配置

---

## 2. 运行日志与调试追踪

### 现状问题
每条消息只存 token 统计和 toolCalls，无法追踪完整的 prompt 构建过程、Skill 注入内容、模型选择等。

### 设计方案

**2.1 新增 message_traces 表**

```sql
message_traces
  id            varchar(36) PK
  messageId     varchar(36) FK → messages.id ON DELETE CASCADE
  systemPrompt  text        -- 最终发给 LLM 的完整 system prompt
  skillsInjected json       -- 注入的 skills 列表
  toolsAvailable json       -- 可用的 tools 列表
  ragContext    text        -- RAG 检索到的内容
  summaryUsed   text        -- 使用的对话摘要
  modelUsed     varchar(255)
  tokenDetails  json        -- { input, output, total, cachedInput }
  latencyMs     int
  createdAt     timestamp
```

**2.2 API 变更**

在对话 API 的 onFinish 中，除了保存 message，额外保存一条 trace 记录。

新增 API：`GET /api/messages/[id]/trace` 获取消息的调试信息。

**2.3 前端展示**

在消息气泡的 meta 信息中新增"调试"按钮，点击展开 trace 详情面板（显示完整 system prompt、注入的 skills、可用 tools、RAG 内容、token 明细等）。

### 涉及文件
- Modify: `src/db/schema.ts` — 新增 messageTraces 表
- Create: `src/server/message-traces.ts` — CRUD
- Modify: `src/app/api/conversations/[id]/messages/route.ts` — 保存 trace
- Create: `src/app/api/messages/[id]/trace/route.ts` — 查询 trace
- Create: `src/components/chat/trace-panel.tsx` — 调试面板 UI

---

## 3. 对话中切换模型

### 设计方案

**3.1 消息级模型覆盖**

在发送消息时允许指定模型：

```typescript
// POST /api/conversations/[id]/messages body 新增
{
  content: "...",
  modelOverride?: string  // 本条消息使用的模型（覆盖 Agent 默认）
}
```

**3.2 重新生成（Regenerate）支持切换模型**

现有的 regenerate 功能扩展：支持指定不同模型重新生成最后一条回复。

**3.3 前端**

- 消息输入框旁新增模型选择下拉（可选，默认用 Agent 配置的模型）
- 消息气泡上的"重新生成"按钮旁新增模型切换选项

### 涉及文件
- Modify: `src/app/api/conversations/[id]/messages/route.ts` — 支持 modelOverride
- Modify: `src/components/chat/chat-input.tsx` — 模型选择 UI
- Modify: `src/components/chat/message-actions.tsx` — 重新生成支持模型选择

---

## 4. MCP 协议兼容

### 设计方案

**4.1 custom_tools 表新增 type: "mcp"**

```sql
type  enum("http", "prompt", "mcp")
```

**4.2 MCP 配置结构**

```typescript
type McpToolConfig = {
  serverUrl: string;      // MCP Server endpoint
  toolName: string;       // MCP Server 暴露的工具名
  authToken?: string;     // 可选认证
};
```

新增 `mcpConfig` JSON 字段到 custom_tools 表。

**4.3 运行时解析**

在 `src/lib/tools/custom-resolve.ts` 中新增 MCP 类型工具的处理：连接 MCP Server，获取工具 schema，转为 CoreTool。

**4.4 前端**

Tool 创建表单中 type 新增 "MCP" 选项，展示 MCP 配置区块（serverUrl、toolName、authToken）。

### 涉及文件
- Modify: `src/db/schema.ts` — custom_tools.type 新增 "mcp"
- Modify: `src/types/custom-tool.ts` — 新增 McpToolConfig
- Modify: `src/lib/validation/custom-tool.ts` — 新增 mcp schema
- Create: `src/lib/tools/mcp-client.ts` — MCP 客户端
- Modify: `src/lib/tools/custom-resolve.ts` — 处理 MCP 类型
- Modify: `src/components/tools/tool-form.tsx` — MCP 配置 UI

---

## 5. Skill/Tool 导入导出

### 设计方案

**5.1 导出格式**

Skill 导出为 `.skill.json`：
```json
{
  "type": "skill",
  "version": "1.0.0",
  "data": { name, description, icon, tags, category, version, argumentHint, content }
}
```

Tool 导出为 `.tool.json`：
```json
{
  "type": "tool",
  "version": "1.0.0",
  "data": { name, displayName, description, icon, tags, type, httpConfig, promptConfig, parameters }
}
```

**5.2 API**

```
GET  /api/skills/[id]/export     → 返回 JSON 文件下载
POST /api/skills/import          → 上传 JSON 文件创建 Skill
GET  /api/custom-tools/[id]/export
POST /api/custom-tools/import
```

**5.3 前端**

- 列表页和详情页新增"导出"按钮
- 列表页新增"导入"按钮（上传 JSON 文件）

### 涉及文件
- Create: `src/app/api/skills/[id]/export/route.ts`
- Create: `src/app/api/skills/import/route.ts`
- Create: `src/app/api/custom-tools/[id]/export/route.ts`
- Create: `src/app/api/custom-tools/import/route.ts`
- Modify: 列表页/详情页组件新增导入导出按钮

---

## 6. 对话分支（Fork）

### 设计方案

**6.1 Fork 逻辑**

从任意消息处"分叉"：删除该消息之后的所有消息，重新从该点生成回复。

实现方式：
- 不真的创建新对话（避免数据膨胀）
- 删除目标消息之后的所有 messages
- 重新触发 AI 生成

**6.2 API**

```
POST /api/conversations/[id]/fork
body: { afterMessageId: string, newContent?: string }
```

- 删除 afterMessageId 之后的所有消息
- 如果提供了 newContent，用新内容替代原始用户消息
- 然后触发正常的 AI 回复流程

**6.3 前端**

消息气泡的操作菜单中新增"从这里重新开始"按钮。

### 涉及文件
- Create: `src/app/api/conversations/[id]/fork/route.ts`
- Modify: `src/server/messages.ts` — 新增 deleteMessagesAfter 函数
- Modify: `src/components/chat/message-actions.tsx` — 新增 fork 按钮

---

## 7. Agent 评测框架

### 设计方案

**7.1 评测用例表**

```sql
eval_cases
  id            varchar(36) PK
  userId        varchar(36) NOT NULL
  agentId       varchar(36) FK → agents.id ON DELETE CASCADE
  name          varchar(255) NOT NULL
  input         text NOT NULL          -- 测试输入
  expectedOutput text                  -- 期望输出（可选，用于对比）
  criteria      text NOT NULL          -- 评判标准（自然语言）
  createdAt     timestamp

eval_runs
  id            varchar(36) PK
  caseId        varchar(36) FK → eval_cases.id ON DELETE CASCADE
  actualOutput  text NOT NULL
  score         float                  -- 0-1 评分
  feedback      text                   -- LLM 评判反馈
  model         varchar(255)
  durationMs    int
  createdAt     timestamp
```

**7.2 评测逻辑**

1. 用 Agent 配置（含 Skills/Tools）对 input 生成回复
2. 用另一个 LLM 调用（judge）对回复打分（基于 criteria 和 expectedOutput）
3. 存储评分和反馈

**7.3 前端**

Agent 详情页新增"评测"标签页：
- 管理评测用例（CRUD）
- "运行评测"按钮批量执行
- 展示评分结果和历史趋势

### 涉及文件
- Modify: `src/db/schema.ts` — 新增 evalCases, evalRuns 表
- Create: `src/server/evals.ts`
- Create: `src/lib/evals/runner.ts` — 评测执行引擎
- Create: `src/app/api/agents/[id]/evals/` — 评测 API
- Create: `src/components/agents/agent-evals.tsx` — 评测 UI

---

## 8. 定时任务

### 设计方案

**8.1 scheduled_tasks 表**

```sql
scheduled_tasks
  id            varchar(36) PK
  userId        varchar(36) NOT NULL
  name          varchar(255) NOT NULL
  type          enum("agent_chat", "workflow_run") NOT NULL
  targetId      varchar(36) NOT NULL    -- agentId 或 workflowId
  input         text NOT NULL           -- 执行输入内容
  cronExpression varchar(50) NOT NULL   -- cron 表达式
  enabled       boolean DEFAULT true
  lastRunAt     timestamp NULL
  nextRunAt     timestamp NULL
  createdAt     timestamp
  updatedAt     timestamp
```

**8.2 执行机制**

复用现有的 workflow worker 模式：
- 启动时注册定时任务检查（每分钟轮询 scheduled_tasks）
- 到时间的任务：type=agent_chat 则创建对话并发消息；type=workflow_run 则入队工作流执行
- 更新 lastRunAt 和计算 nextRunAt

**8.3 前端**

新增顶级页面 `/schedules`（或放在 Settings 下）：
- CRUD 定时任务
- 配置 cron 表达式（提供可视化 cron 选择器）
- 查看执行历史

### 涉及文件
- Modify: `src/db/schema.ts` — 新增 scheduledTasks 表
- Create: `src/server/scheduled-tasks.ts` — CRUD
- Create: `src/lib/scheduler/worker.ts` — 定时任务 worker
- Create: `src/app/api/scheduled-tasks/` — API
- Create: `src/app/(app)/schedules/` — 页面
- Modify: `src/components/nav/primary-sidebar.tsx` — 导航入口

---

## 不在本批范围

- 工作流可视化变量调试面板的实时刷新（后续优化）
- MCP Server 自动发现（手动配置即可）
- 评测框架的统计图表（第一期只展示表格）
- 定时任务的失败重试和告警通知
