# Skill & Tool 模块设计规格

## 概述

为 AgentNexus 新增 **Skill（技能）** 和 **Tool（自定义工具）** 两个独立模块，使 Agent 从"硬编码能力"升级为"用户可配置能力"。

- **Skill** 定义 Agent "是什么、擅长什么"——挂载后 Agent 自动获得对应的提示词指令和行为模式
- **Tool** 定义 Agent "能做什么"——挂载后 Agent 可在对话中调用用户自定义的工具函数

两者独立管理，在 Agent 配置时自由组合关联。运行时通过 API 拉取关联的 Skill/Tool，动态拼装出一个增强版 Agent 执行对话。

### 设计原则

- 借鉴 Claude Skills 的三层渐进式架构和 Mastra 的工具定义模式，但不引入外部框架依赖
- 与现有代码模式一致（独立实体 + 关联表，参照 `agent_knowledge_bases`、`agent_team_members`）
- 遵循项目三层架构：API route → Server service → DB schema

---

## 一、数据库 Schema

### 1.1 skills 表

```sql
skills
  id                varchar(36) PK  -- createId()
  userId            varchar(36) NOT NULL
  name              varchar(255) NOT NULL
  description       text NOT NULL
  icon              varchar(255) DEFAULT ""
  tags              json DEFAULT []             -- string[]
  category          varchar(50) DEFAULT ""      -- development/writing/analysis/communication/other
  instructions      text NOT NULL               -- 核心提示词指令
  examples          json DEFAULT []             -- Array<{input: string, output: string}>
  recommendedTools  json DEFAULT []             -- string[]，推荐搭配的 Tool name
  createdAt         timestamp
  updatedAt         timestamp
```

### 1.2 agent_skills 关联表

```sql
agent_skills
  agentId   varchar(36) FK → agents.id ON DELETE CASCADE
  skillId   varchar(36) FK → skills.id ON DELETE CASCADE
```

### 1.3 custom_tools 表

```sql
custom_tools
  id              varchar(36) PK  -- createId()
  userId          varchar(36) NOT NULL
  name            varchar(100) NOT NULL         -- 英文下划线标识如 "weather_query"
  displayName     varchar(255) NOT NULL         -- 中文展示名如 "天气查询"
  description     text NOT NULL                 -- 给 LLM 看的功能描述
  icon            varchar(255) DEFAULT ""
  tags            json DEFAULT []               -- string[]
  type            enum("http", "prompt") NOT NULL
  httpConfig      json NULL                     -- HttpToolConfig | null
  promptConfig    json NULL                     -- PromptToolConfig | null
  parameters      json DEFAULT []               -- ToolParameter[]
  createdAt       timestamp
  updatedAt       timestamp
```

**httpConfig 结构：**

```typescript
type HttpToolConfig = {
  url: string;                              // "https://api.weather.com/v1/current"
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;         // { "Authorization": "Bearer {{apiKey}}" }
  bodyTemplate?: string;                    // JSON 模板，含 {{param}} 插槽
  queryTemplate?: Record<string, string>;   // { "city": "{{city}}" }
};
```

**promptConfig 结构：**

```typescript
type PromptToolConfig = {
  systemInstruction: string;  // 给 LLM 的处理指令
  outputFormat?: string;      // "json" | "text" | "markdown"
};
```

**parameters 结构：**

```typescript
type ToolParameter = {
  name: string;
  type: "string" | "number" | "boolean";
  description: string;
  required: boolean;
  default?: string | number | boolean;
};
```

### 1.4 agent_custom_tools 关联表

```sql
agent_custom_tools
  agentId   varchar(36) FK → agents.id ON DELETE CASCADE
  toolId    varchar(36) FK → custom_tools.id ON DELETE CASCADE
```

---

## 二、运行时组装逻辑

### 2.1 Skill 注入：拼接 system prompt

Agent 对话时，查询 `agent_skills` 关联的所有 Skills，将其 `instructions` 和 `examples` 拼接到 Agent 原始 `systemPrompt` 尾部：

```
{原始 systemPrompt}

---
你具备以下专业技能，请在相关任务中自动运用：

## 技能：{skill.name}
{skill.instructions}

参考示例：
用户：{example.input}
助手：{example.output}

## 技能：{skill2.name}
...
```

- Skills 全部注入，不做动态语义匹配（用户显式挂载，数量可控）
- `recommendedTools` 仅作为 UI 层建议，不影响运行时

### 2.2 Tool 注入：动态构建 CoreTool

查询 `agent_custom_tools` 关联的所有 Tools，转换为 Vercel AI SDK 的 `CoreTool` 对象：

**HTTP 型工具：**
- 根据 `parameters` 动态构建 Zod schema
- `execute` 函数：将参数插值到 URL/headers/body 模板中，发送 HTTP 请求，返回响应文本

**Prompt 型工具：**
- 根据 `parameters` 动态构建 Zod schema
- `execute` 函数：将 `promptConfig.systemInstruction` 和参数拼接成指令文本返回，由 LLM 按指令处理

### 2.3 与现有工具体系合并

扩展现有 `resolveAgentTools` 函数签名，新增 `customTools` 参数：

```typescript
function resolveAgentTools(
  enabledBuiltinTools: string[],     // 内置工具（不变）
  customTools: CustomTool[],          // 新增：用户自定义工具
  searchConfig?,                      // 不变
  teamToolDefs?,                      // 不变
): Record<string, CoreTool> | undefined
```

合并顺序：内置工具 → 自定义工具 → 团队委派工具。

### 2.4 对话 API 改造

在 `/api/conversations/[id]/route.ts`（或 chat 流式接口）的处理流程中：

1. 根据 agentId 查出 agent 基本信息
2. **新增**：查出关联的 Skills → 拼接 system prompt
3. **新增**：查出关联的 Custom Tools → 构建 CoreTool
4. 调用 `streamAgentReply`（参数不变，只是 system prompt 和 tools 更丰富了）

---

## 三、API 路由

### 3.1 Skills CRUD

| Method | Path | 说明 |
|--------|------|------|
| POST | `/api/skills` | 创建 Skill |
| GET | `/api/skills` | 列出当前用户的 Skills |
| GET | `/api/skills/[id]` | 获取单个 Skill |
| PUT | `/api/skills/[id]` | 更新 Skill |
| DELETE | `/api/skills/[id]` | 删除 Skill |

### 3.2 Custom Tools CRUD

| Method | Path | 说明 |
|--------|------|------|
| POST | `/api/custom-tools` | 创建 Tool |
| GET | `/api/custom-tools` | 列出当前用户的 Tools |
| GET | `/api/custom-tools/[id]` | 获取单个 Tool |
| PUT | `/api/custom-tools/[id]` | 更新 Tool |
| DELETE | `/api/custom-tools/[id]` | 删除 Tool |

### 3.3 Agent 关联

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/agents/[id]/skills` | 获取 Agent 关联的 Skills |
| PUT | `/api/agents/[id]/skills` | 全量更新关联的 Skill 列表 |
| GET | `/api/agents/[id]/custom-tools` | 获取 Agent 关联的 Tools |
| PUT | `/api/agents/[id]/custom-tools` | 全量更新关联的 Tool 列表 |

### 3.4 Validation Schema

```
src/lib/validation/skill.ts        -- skillInputSchema / skillUpdateSchema
src/lib/validation/custom-tool.ts   -- customToolInputSchema / customToolUpdateSchema
```

---

## 四、服务层

```
src/server/skills.ts              -- createSkill / listSkills / getSkill / updateSkill / deleteSkill
src/server/custom-tools.ts        -- createCustomTool / listCustomTools / getCustomTool / updateCustomTool / deleteCustomTool
src/server/agent-skills.ts        -- getAgentSkills / setAgentSkills
src/server/agent-custom-tools.ts  -- getAgentCustomTools / setAgentCustomTools
```

每个文件遵循现有模式：纯异步函数直接操作 Drizzle，做权限隔离（userId 校验）。

---

## 五、前端

### 5.1 导航

侧边栏新增两个顶级入口，与 Agents、Knowledge 同级：

```
📊 Dashboard
🤖 Agents
💬 Chat
🔀 Workflows
📚 Knowledge
⚡ Skills        ← 新增
🔧 Tools         ← 新增
⚙️ Settings
```

### 5.2 页面路由

```
src/app/(app)/skills/
  page.tsx                -- Skills 列表页（卡片网格，按 category 分组）
  new/page.tsx            -- 新建 Skill
  [id]/page.tsx           -- 编辑 Skill

src/app/(app)/tools/
  page.tsx                -- Tools 列表页（卡片网格）
  new/page.tsx            -- 新建 Tool
  [id]/page.tsx           -- 编辑 Tool
```

### 5.3 组件

```
src/components/skills/
  skill-card.tsx                -- 列表卡片（icon + name + description + tags）
  skill-form.tsx                -- 创建/编辑表单
  skill-examples-editor.tsx     -- few-shot 示例编辑器（可增删 input/output 对）

src/components/tools/
  tool-card.tsx                 -- 列表卡片
  tool-form.tsx                 -- 创建/编辑表单（根据 type 切换 httpConfig/promptConfig 表单区块）
  tool-parameters-editor.tsx    -- 参数定义编辑器（可增删参数行）

src/components/agents/
  agent-skills-config.tsx       -- Agent 编辑页中的 Skill 选择器（多选列表）
  agent-custom-tools-config.tsx -- Agent 编辑页中的 Tool 选择器（多选列表）
```

### 5.4 Agent 配置页面扩展

在现有 `agent-form.tsx` 左栏中，与 AgentToolsConfig（内置工具）、AgentKnowledgeConfig、AgentTeamConfig 并列，新增"自定义工具"和"技能配置"两个区块。

### 5.5 TanStack Query Hooks

```
src/hooks/use-skills.ts         -- useSkills / useSkill / useCreateSkill / useUpdateSkill / useDeleteSkill
src/hooks/use-custom-tools.ts   -- useCustomTools / useCustomTool / useCreateCustomTool / useUpdateCustomTool / useDeleteCustomTool
```

### 5.6 国际化

```
messages/en.json     → 新增 skills / customTools 命名空间
messages/zh-CN.json  → 同上
```

---

## 六、类型定义

```
src/types/skill.ts
  Skill          -- 完整 Skill 类型
  SkillFormValues -- 表单值类型

src/types/custom-tool.ts
  CustomTool          -- 完整 Tool 类型
  CustomToolFormValues -- 表单值类型
  HttpToolConfig
  PromptToolConfig
  ToolParameter
```

---

## 七、不在本期范围

- MCP 协议兼容（Tool 数据结构已预留扩展性，后续可加 `type: "mcp"`）
- Skill/Tool 市场（用户间共享/导入导出）
- Skill 内嵌脚本执行（Claude Skills 的 scripts/ 能力，目前不需要）
- Skill 渐进式加载（我们的场景是用户显式挂载，数量可控，全量注入即可）
- Tool 沙箱化执行（HTTP 调用本身无安全风险；Prompt 型不执行外部代码）
