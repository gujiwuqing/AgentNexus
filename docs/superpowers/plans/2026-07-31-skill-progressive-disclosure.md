# Skill Progressive Disclosure Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Skill 从"全量注入 system prompt"改造为 Claude 式的"渐进式披露"——挂载的 Skill 只把 name+description 常驻上下文（作为 `load_skill` 元工具的 description），模型判断相关时才主动调用加载完整内容；同时补齐资源分层（`read_skill_resource`）与工具权限联动（`allowedTools` 运行时拦截）。

**Architecture:** 新增两个 Skill 元工具（`load_skill`、`read_skill_resource`），在 `resolveAgentTools` 中统一组装并用 `wrapWithSkillGuard` 包裹；三处调用点（主对话、团队委派、评测执行）删除原有的 system prompt 全量拼接逻辑，改为把 Skill 行数据传给 `resolveAgentTools`。

**Tech Stack:** Next.js 15, TypeScript, Drizzle ORM (MySQL), Vercel AI SDK v4 (`tool`, `CoreTool`, `streamText`/`generateText` 的 `maxSteps` 多步工具调用), Zod

**Spec:** `docs/superpowers/specs/2026-07-31-skill-progressive-disclosure-design.md`

---

## Task 1: 数据库 Schema 变更

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1: 在 skills 表新增 resources 和 allowedTools 字段**

找到 `src/db/schema.ts` 中的 `skills` 表定义（约第 305 行），在 `content` 字段之后新增：

```typescript
  resources: json("resources").notNull().$type<Array<{ title: string; content: string }>>().default([]),
  allowedTools: json("allowed_tools").notNull().$type<string[]>().default([]),
```

完整的 `skills` 表定义应为：

```typescript
export const skills = mysqlTable("skills", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
  userId: varchar("user_id", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 255 }).notNull().default(""),
  tags: json("tags").notNull().$type<string[]>().default([]),
  category: varchar("category", { length: 50 }).notNull().default(""),
  version: varchar("version", { length: 50 }).notNull().default("1.0.0"),
  argumentHint: text("argument_hint").notNull().default(""),
  content: text("content").notNull(),
  resources: json("resources").notNull().$type<Array<{ title: string; content: string }>>().default([]),
  allowedTools: json("allowed_tools").notNull().$type<string[]>().default([]),
  createdAt: timestamp("created_at", { mode: "date", fsp: 6 })
    .notNull().defaultNow().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at", { mode: "date", fsp: 6 })
    .notNull().defaultNow().$defaultFn(() => new Date()),
});
```

- [ ] **Step 2: 推送 schema 变更到数据库**

**必须用 `drizzle-kit push`，不要手写 `ALTER TABLE`**——本项目此前因为手写 SQL 加列却没同步 `schema.ts` 定义，导致下次 `drizzle-kit push` 把该列静默删除（详见 `CLAUDE.md` 的 "Drizzle schema drift gotcha" 记录）。始终让 `schema.ts` 是唯一真相源。

```bash
cd /Users/feng/work/AgentNexus && DATABASE_URL="mysql://root:Fengweihui1998%21@127.0.0.1:3306/agentnexus" npx drizzle-kit push --force
```

预期输出包含 `ALTER TABLE \`skills\` ADD COLUMN \`resources\` ...` 和 `ADD COLUMN \`allowed_tools\` ...`，最后一行 `[✓] Changes applied`。

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat(db): add resources and allowedTools columns to skills table"
```

---

## Task 2: 类型与验证同步

**Files:**
- Modify: `src/types/skill.ts`
- Modify: `src/lib/validation/skill.ts`

- [ ] **Step 1: 更新 Skill 类型**

将 `src/types/skill.ts` 整体替换为：

```typescript
export type SkillResource = {
  title: string;
  content: string;
};

export type Skill = {
  id: string;
  name: string;
  description: string;
  icon: string;
  tags: string[];
  category: string;
  version: string;
  argumentHint: string;
  content: string;
  resources: SkillResource[];
  allowedTools: string[];
  createdAt: string;
  updatedAt: string;
};

export type SkillFormValues = {
  name: string;
  description: string;
  icon: string;
  tags: string[];
  category: string;
  version: string;
  argumentHint: string;
  content: string;
  resources: SkillResource[];
  allowedTools: string[];
};
```

- [ ] **Step 2: 更新 Zod 校验 schema**

将 `src/lib/validation/skill.ts` 整体替换为：

```typescript
import { z } from "zod";

const skillResourceSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});

export const skillInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().default(""),
  icon: z.string().default(""),
  tags: z.array(z.string()).default([]),
  category: z.string().default(""),
  version: z.string().default("1.0.0"),
  argumentHint: z.string().default(""),
  content: z.string().min(1, "Content is required"),
  resources: z.array(skillResourceSchema).default([]),
  allowedTools: z.array(z.string()).default([]),
});

export type SkillInput = z.infer<typeof skillInputSchema>;

export const skillUpdateSchema = skillInputSchema.partial();
export type SkillUpdateInput = z.infer<typeof skillUpdateSchema>;
```

- [ ] **Step 3: Commit**

```bash
git add src/types/skill.ts src/lib/validation/skill.ts
git commit -m "feat(types): add resources and allowedTools to Skill type and validation"
```

---

## Task 3: 服务层 — agent-skills.ts 补充字段

**Files:**
- Modify: `src/server/agent-skills.ts`

- [ ] **Step 1: 更新 getAgentSkills 的 select 字段**

将 `src/server/agent-skills.ts` 中的 `getAgentSkills` 函数替换为：

```typescript
export async function getAgentSkills(agentId: string) {
  const rows = await db
    .select({
      id: skills.id,
      name: skills.name,
      description: skills.description,
      icon: skills.icon,
      category: skills.category,
      content: skills.content,
      resources: skills.resources,
      allowedTools: skills.allowedTools,
    })
    .from(agentSkills)
    .innerJoin(skills, eq(agentSkills.skillId, skills.id))
    .where(eq(agentSkills.agentId, agentId));
  return rows;
}
```

（其余函数 `getAgentSkillIds`、`setAgentSkills` 不变）

- [ ] **Step 2: Commit**

```bash
git add src/server/agent-skills.ts
git commit -m "feat(skills): include resources and allowedTools in getAgentSkills query"
```

---

## Task 4: Skill 元工具

**Files:**
- Create: `src/lib/skills/skill-tools.ts`

- [ ] **Step 1: 创建 Skill 元工具构建函数**

```typescript
// src/lib/skills/skill-tools.ts
import { tool, type CoreTool } from "ai";
import { z } from "zod";

export type SkillForTools = {
  name: string;
  description: string;
  icon: string;
  content: string;
  resources: Array<{ title: string; content: string }>;
  allowedTools: string[];
};

/**
 * L1（元数据）+ L2（正文）：description 罗列全部挂载 Skill 的 name+description，
 * 模型判断相关时调用，execute 返回该 Skill 的完整 content。
 */
export function buildLoadSkillTool(skills: SkillForTools[]): CoreTool | null {
  if (skills.length === 0) return null;
  const catalog = skills.map((s) => `- ${s.name}：${s.description}`).join("\n");
  const names = skills.map((s) => s.name) as [string, ...string[]];

  return tool({
    description: `可用技能列表，相关时调用以加载完整说明：\n${catalog}`,
    parameters: z.object({
      skillName: z.enum(names).describe("要加载的技能名称"),
    }),
    execute: async ({ skillName }) => {
      const skill = skills.find((s) => s.name === skillName);
      return skill ? skill.content : `未找到技能：${skillName}`;
    },
  });
}

/**
 * L3（资源层）：模型在 Skill 正文中看到"详见 XXX"之类的引用时调用，
 * 读取该 Skill 对应的参考资料全文。
 */
export function buildReadSkillResourceTool(skills: SkillForTools[]): CoreTool | null {
  if (skills.length === 0) return null;
  const names = skills.map((s) => s.name) as [string, ...string[]];

  return tool({
    description: "读取某个技能的参考资料（当技能正文提示'详见 XXX'时调用）",
    parameters: z.object({
      skillName: z.enum(names).describe("技能名称"),
      resourceTitle: z.string().describe("参考资料标题"),
    }),
    execute: async ({ skillName, resourceTitle }) => {
      const skill = skills.find((s) => s.name === skillName);
      const resource = skill?.resources.find((r) => r.title === resourceTitle);
      return resource ? resource.content : `未找到参考资料：${resourceTitle}`;
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/skills/skill-tools.ts
git commit -m "feat(skills): add load_skill and read_skill_resource meta-tools"
```

---

## Task 5: allowedTools 运行时拦截

**Files:**
- Create: `src/lib/tools/skill-guard.ts`

- [ ] **Step 1: 创建拦截包装函数**

```typescript
// src/lib/tools/skill-guard.ts
import type { CoreTool } from "ai";

/** 这两个元工具永远豁免拦截，否则一旦某个 Skill 收紧了范围，模型就无法再切换 Skill 或读参考资料。 */
const EXEMPT_TOOL_NAMES = new Set(["load_skill", "read_skill_resource"]);

/**
 * 包装工具集：当模型调用 load_skill 加载了一个设置了 allowedTools 的 Skill 后，
 * 本次调用剩余的所有 step 里，非豁免工具只能在该 Skill（或其他已激活 Skill）的
 * allowedTools 并集范围内执行；不在范围内直接返回拒绝提示，不执行原逻辑。
 *
 * 状态（activeUnion/restricted）通过闭包在同一次 resolveAgentTools() 调用产生的
 * 工具集上共享，天然贯穿一次 streamText/generateText 调用的所有 step。
 */
export function wrapWithSkillGuard(
  tools: Record<string, CoreTool>,
  skillAllowedToolsByName: Record<string, string[]>,
): Record<string, CoreTool> {
  const hasAnyRestriction = Object.values(skillAllowedToolsByName).some((list) => list.length > 0);
  if (!hasAnyRestriction) return tools;

  const activeUnion = new Set<string>();
  let restricted = false;

  const wrapped: Record<string, CoreTool> = {};

  for (const [name, def] of Object.entries(tools)) {
    const originalExecute = def.execute;
    if (!originalExecute) {
      wrapped[name] = def;
      continue;
    }

    if (name === "load_skill") {
      wrapped[name] = {
        ...def,
        execute: async (params: Record<string, unknown>, options) => {
          const result = await originalExecute(params, options);
          const skillName = params?.skillName as string | undefined;
          const allowList = skillName ? skillAllowedToolsByName[skillName] : undefined;
          if (allowList && allowList.length > 0) {
            restricted = true;
            for (const toolName of allowList) activeUnion.add(toolName);
          }
          return result;
        },
      } as CoreTool;
    } else if (EXEMPT_TOOL_NAMES.has(name)) {
      wrapped[name] = def;
    } else {
      wrapped[name] = {
        ...def,
        execute: async (params: Record<string, unknown>, options) => {
          if (restricted && !activeUnion.has(name)) {
            return "该工具在当前技能激活期间不可用（技能设置了允许的工具范围）。";
          }
          return originalExecute(params, options);
        },
      } as CoreTool;
    }
  }

  return wrapped;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/tools/skill-guard.ts
git commit -m "feat(tools): add runtime allowedTools interception guard for Skills"
```

---

## Task 6: 改造 resolveAgentTools 统一组装

**Files:**
- Modify: `src/lib/tools/resolve.ts`

- [ ] **Step 1: 更新 resolveAgentTools 签名与实现**

将 `src/lib/tools/resolve.ts` 整体替换为：

```typescript
import { tool, type CoreTool } from "ai";
import { toolMap } from "./registry";
import { executeWebSearch } from "./web-search";
import type { ToolDefinition } from "./types";
import { resolveCustomTools } from "./custom-resolve";
import { buildLoadSkillTool, buildReadSkillResourceTool, type SkillForTools } from "@/lib/skills/skill-tools";
import { wrapWithSkillGuard } from "./skill-guard";

export function resolveAgentTools(
  enabledTools: string[],
  searchConfig?: { provider: string; apiKey: string } | null,
  customToolRows?: Array<{
    name: string;
    description: string;
    type: "http" | "prompt" | "mcp";
    httpConfig: unknown;
    promptConfig: unknown;
    mcpConfig: unknown;
    parameters: Array<{
      name: string;
      type: "string" | "number" | "boolean";
      description: string;
      required: boolean;
      default?: string | number | boolean;
    }>;
  }>,
  teamToolDefs?: ToolDefinition[],
  skillRows?: SkillForTools[],
): Record<string, CoreTool> | undefined {
  const hasSkills = Boolean(skillRows && skillRows.length > 0);
  if (
    enabledTools.length === 0 &&
    (!customToolRows || customToolRows.length === 0) &&
    (!teamToolDefs || teamToolDefs.length === 0) &&
    !hasSkills
  ) {
    return undefined;
  }

  const tools: Record<string, CoreTool> = {};

  for (const name of enabledTools) {
    const def = toolMap.get(name);
    if (!def) continue;

    if (name === "web_search" && searchConfig?.apiKey) {
      tools[name] = tool({
        description: def.description,
        parameters: def.parameters,
        execute: async (params) =>
          executeWebSearch(
            params.query as string,
            (params.maxResults as number) ?? 5,
            searchConfig.provider,
            searchConfig.apiKey,
          ),
      });
    } else {
      tools[name] = tool({
        description: def.description,
        parameters: def.parameters,
        execute: def.execute,
      });
    }
  }

  // 自定义工具
  if (customToolRows && customToolRows.length > 0) {
    Object.assign(tools, resolveCustomTools(customToolRows as Parameters<typeof resolveCustomTools>[0]));
  }

  for (const def of teamToolDefs ?? []) {
    tools[def.name] = tool({
      description: def.description,
      parameters: def.parameters,
      execute: def.execute,
    });
  }

  // Skill 元工具（渐进式披露：load_skill 只暴露 name+description，内容按需加载）
  if (hasSkills && skillRows) {
    const loadSkillTool = buildLoadSkillTool(skillRows);
    if (loadSkillTool) tools["load_skill"] = loadSkillTool;
    const readResourceTool = buildReadSkillResourceTool(skillRows);
    if (readResourceTool) tools["read_skill_resource"] = readResourceTool;
  }

  if (Object.keys(tools).length === 0) return undefined;

  // allowedTools 运行时拦截：统一在全部工具组装完成后包裹
  if (hasSkills && skillRows) {
    const allowedToolsByName = Object.fromEntries(skillRows.map((s) => [s.name, s.allowedTools]));
    return wrapWithSkillGuard(tools, allowedToolsByName);
  }

  return tools;
}
```

**注意**：`customToolRows` 类型新增了 `mcpConfig: unknown` 字段——这是为了与 `resolveCustomTools` 实际接受的 `CustomToolRow` 类型（含 `mcpConfig`）保持一致，此前的签名遗漏了这个字段但因为用了 `as Parameters<typeof resolveCustomTools>[0]` 做类型断言而没有报错；本次顺手补上避免类型漂移。

- [ ] **Step 2: Commit**

```bash
git add src/lib/tools/resolve.ts
git commit -m "feat(tools): wire Skill meta-tools and allowedTools guard into resolveAgentTools"
```

---

## Task 7: 主对话 API 改造

**Files:**
- Modify: `src/app/api/conversations/[id]/messages/route.ts`

- [ ] **Step 1: 移除 buildSkillSystemPrompt 的 import 和调用**

删除顶部这一行 import：

```typescript
import { buildSkillSystemPrompt } from "@/lib/skills/prompt-builder";
```

删除以下代码块（原本在 RAG 注入之前，负责把 Skill 内容拼进 system prompt）：

```typescript
  // 注入关联的 Skills 到 system prompt
  const agentSkillRows = await getAgentSkills(agent.id);
  if (agentSkillRows.length > 0) {
    const skillPrompt = buildSkillSystemPrompt(agentSkillRows);
    if (chatMessages.length > 0 && chatMessages[0].role === "system") {
      chatMessages[0] = {
        role: "system",
        content: (chatMessages[0].content as string) + skillPrompt,
      };
    } else {
      chatMessages.unshift({ role: "system", content: skillPrompt });
    }
  }
```

替换为（只查询，不再拼系统提示）：

```typescript
  const agentSkillRows = await getAgentSkills(agent.id);
```

- [ ] **Step 2: 把 agentSkillRows 传给 resolveAgentTools**

找到：

```typescript
  const tools = resolveAgentTools(enabledTools, searchConfig, agentCustomToolRows, teamToolDefs);
```

替换为：

```typescript
  const tools = resolveAgentTools(enabledTools, searchConfig, agentCustomToolRows, teamToolDefs, agentSkillRows);
```

- [ ] **Step 3: 修正 activeSkills 的计算逻辑——从"全部挂载"改为"本轮真正加载过"**

找到 `onFinish` 回调里的这一行：

```typescript
      const activeSkills = agentSkillRows.length > 0
        ? agentSkillRows.map((s) => ({ name: s.name, icon: s.icon || "⚡" }))
        : null;
```

替换为：

```typescript
      const loadedSkillNames = new Set(
        meta.toolCalls
          .filter((tc) => tc.toolName === "load_skill")
          .map((tc) => tc.args?.skillName as string | undefined)
          .filter((name): name is string => Boolean(name)),
      );
      const activeSkills = loadedSkillNames.size > 0
        ? agentSkillRows
            .filter((s) => loadedSkillNames.has(s.name))
            .map((s) => ({ name: s.name, icon: s.icon || "⚡" }))
        : null;
```

- [ ] **Step 4: 给 load_skill / read_skill_resource 工具调用补充友好的 displayName**

找到 `enrichedToolCalls` 的映射逻辑：

```typescript
      const enrichedToolCalls = meta.toolCalls.map((tc) => {
        if (tc.toolName.startsWith("delegate_to_")) {
          const memberId = tc.toolName.replace("delegate_to_", "");
          const member = teamMembers.find((m) => m.memberAgentId === memberId);
          return { ...tc, displayName: member?.memberAgentName ?? tc.toolName };
        }
        const customTool = agentCustomToolRows.find((ct) => ct.name === tc.toolName);
        if (customTool) {
          return { ...tc, displayName: customTool.displayName };
        }
        const builtin = getToolByName(tc.toolName);
        return { ...tc, displayName: builtin?.displayName ?? tc.toolName };
      });
```

在 `delegate_to_` 分支之后、`customTool` 分支之前，新增 Skill 元工具的 displayName 处理：

```typescript
      const enrichedToolCalls = meta.toolCalls.map((tc) => {
        if (tc.toolName.startsWith("delegate_to_")) {
          const memberId = tc.toolName.replace("delegate_to_", "");
          const member = teamMembers.find((m) => m.memberAgentId === memberId);
          return { ...tc, displayName: member?.memberAgentName ?? tc.toolName };
        }
        if (tc.toolName === "load_skill") {
          return { ...tc, displayName: `加载技能：${tc.args?.skillName ?? ""}` };
        }
        if (tc.toolName === "read_skill_resource") {
          return { ...tc, displayName: `读取参考资料：${tc.args?.resourceTitle ?? ""}` };
        }
        const customTool = agentCustomToolRows.find((ct) => ct.name === tc.toolName);
        if (customTool) {
          return { ...tc, displayName: customTool.displayName };
        }
        const builtin = getToolByName(tc.toolName);
        return { ...tc, displayName: builtin?.displayName ?? tc.toolName };
      });
```

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/conversations/[id]/messages/route.ts"
git commit -m "feat(chat): switch Skill injection to progressive-disclosure meta-tools in main conversation route"
```

---

## Task 8: 团队委派改造

**Files:**
- Modify: `src/server/agent-team.ts`

- [ ] **Step 1: 移除 buildSkillSystemPrompt 的 import 和使用**

删除顶部这一行 import：

```typescript
import { buildSkillSystemPrompt } from "@/lib/skills/prompt-builder";
```

找到 `callTeamMember` 函数中的这段：

```typescript
  const memberSkills = await getAgentSkills(agent.id);
  const skillPrompt = buildSkillSystemPrompt(memberSkills);
  const systemContent = agent.systemPrompt
    ? agent.systemPrompt + skillPrompt
    : skillPrompt || undefined;

  const baseMessages = [
    ...(systemContent ? [{ role: "system" as const, content: systemContent }] : []),
    { role: "user" as const, content: task },
  ];
```

替换为：

```typescript
  const memberSkills = await getAgentSkills(agent.id);

  const baseMessages = [
    ...(agent.systemPrompt ? [{ role: "system" as const, content: agent.systemPrompt }] : []),
    { role: "user" as const, content: task },
  ];
```

- [ ] **Step 2: 把 memberSkills 传给 resolveAgentTools**

找到：

```typescript
  const memberCustomTools = await getAgentCustomTools(agent.id);
  const tools = resolveAgentTools(enabledTools, searchConfig, memberCustomTools, subToolDefs);
```

替换为：

```typescript
  const memberCustomTools = await getAgentCustomTools(agent.id);
  const tools = resolveAgentTools(enabledTools, searchConfig, memberCustomTools, subToolDefs, memberSkills);
```

- [ ] **Step 3: Commit**

```bash
git add src/server/agent-team.ts
git commit -m "feat(team): switch delegated member Agent's Skill injection to progressive-disclosure meta-tools"
```

---

## Task 9: 评测执行改造

**Files:**
- Modify: `src/lib/evals/runner.ts`

- [ ] **Step 1: 重写 runEvalCase，改用工具化 Skill 机制 + generateAgentReply**

先读取当前 `src/lib/evals/runner.ts` 全文确认结构没有偏差，然后整体替换为：

```typescript
import { generateText } from "ai";
import type { ProviderConfig } from "@/lib/ai/provider";
import { createModelClient } from "@/lib/ai/provider-factory";
import { generateAgentReply } from "@/lib/ai/generate";
import { getAgent } from "@/server/agents";
import { getProviderConfig } from "@/server/provider-config";
import { resolveProviderConfig } from "@/lib/ai/provider";
import { getAgentSkills } from "@/server/agent-skills";
import { resolveAgentTools } from "@/lib/tools/resolve";
import { createEvalRun } from "@/server/evals";
import type { EvalCaseInput } from "@/server/evals";

type EvalCaseRow = {
  id: string;
  agentId: string;
  input: string;
  expectedOutput: string | null;
  criteria: string;
};

export async function runEvalCase(evalCase: EvalCaseRow, userId: string): Promise<{ score: number; feedback: string; output: string }> {
  const agent = await getAgent(evalCase.agentId);
  if (!agent) throw new Error("Agent not found");

  const globalConfig = await getProviderConfig(userId);
  const provider = resolveProviderConfig(agent.model, globalConfig);

  // Skill 通过工具化机制挂载（渐进式披露），不再全量拼进 system prompt
  const skills = await getAgentSkills(agent.id);
  const tools = resolveAgentTools([], null, undefined, undefined, skills);

  const messages = [
    ...(agent.systemPrompt ? [{ role: "system" as const, content: agent.systemPrompt }] : []),
    { role: "user" as const, content: evalCase.input },
  ];

  const startedAt = Date.now();
  const actualOutput = await generateAgentReply(
    provider,
    messages,
    { temperature: agent.temperature, maxTokens: agent.maxTokens, topP: agent.topP },
    tools,
  );
  const durationMs = Date.now() - startedAt;

  // 用 LLM 评判
  const judgePrompt = [
    "你是一个 AI 输出质量评判员。请对以下 AI 回复进行评分（0-1 分）。",
    "",
    `评判标准：${evalCase.criteria}`,
    "",
    `用户输入：${evalCase.input}`,
    "",
    evalCase.expectedOutput ? `期望输出参考：${evalCase.expectedOutput}\n` : "",
    `实际输出：${actualOutput}`,
    "",
    "请严格按以下 JSON 格式输出（不要输出其他内容）：",
    '{"score": 0.85, "feedback": "简要评判理由"}',
  ].filter(Boolean).join("\n");

  const judgeResult = await generateText({
    model: createModelClient(provider),
    messages: [{ role: "user", content: judgePrompt }],
    maxTokens: 500,
    temperature: 0.1,
  });

  let score = 0;
  let feedback = "";
  try {
    const parsed = JSON.parse(judgeResult.text);
    score = typeof parsed.score === "number" ? Math.max(0, Math.min(1, parsed.score)) : 0;
    feedback = parsed.feedback || "";
  } catch {
    feedback = judgeResult.text;
    score = 0.5;
  }

  await createEvalRun({
    caseId: evalCase.id,
    actualOutput,
    score,
    feedback,
    model: provider.model,
    durationMs,
  });

  return { score, feedback, output: actualOutput };
}
```

**变化说明**：Agent 回复生成从直接调用 `generateText`（无 tools、无多步）改为复用现有的 `generateAgentReply`（`src/lib/ai/generate.ts`，内置 `tools` 参数与 `maxSteps: 5`），这样评测执行时模型才能实际调用 `load_skill` 加载技能内容，而不是像之前那样跳过工具调用能力、单纯依赖 system prompt 里硬拼的文本。评判（judge）调用保持不变，仍用原始 `generateText`（不需要工具）。

- [ ] **Step 2: Commit**

```bash
git add src/lib/evals/runner.ts
git commit -m "feat(evals): switch Skill injection to progressive-disclosure meta-tools, reuse generateAgentReply for tool support"
```

---

## Task 10: 删除废弃的 prompt-builder.ts

**Files:**
- Delete: `src/lib/skills/prompt-builder.ts`

- [ ] **Step 1: 确认没有残留引用**

```bash
cd /Users/feng/work/AgentNexus && grep -rn "buildSkillSystemPrompt\|prompt-builder" src/ --include="*.ts" --include="*.tsx"
```

预期：无任何匹配结果（Task 7/8/9 已经把三处调用点全部迁移完毕）。若仍有匹配，先处理干净再继续。

- [ ] **Step 2: 删除文件**

```bash
rm src/lib/skills/prompt-builder.ts
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore(skills): remove deprecated full-injection prompt-builder"
```

---

## Task 11: 前端 — Skill 表单新增资源编辑器与工具权限多选

**Files:**
- Modify: `src/components/skills/skill-form.tsx`
- Modify: `messages/zh-CN.json`
- Modify: `messages/en.json`

- [ ] **Step 1: 在 skill-form.tsx 中新增 resources 编辑器和 allowedTools 多选**

先读取当前 `src/components/skills/skill-form.tsx` 全文（本次会话中已多次改动，确保拿到最新版本），然后进行以下修改：

1. 顶部新增 import：

```typescript
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useCustomTools } from "@/hooks/use-custom-tools";
import type { Skill, SkillFormValues, SkillResource } from "@/types/skill";
```

2. 更新 `toFormValues` 函数，新增两个字段：

```typescript
function toFormValues(skill?: Skill): SkillFormValues {
  return {
    name: skill?.name ?? "",
    description: skill?.description ?? "",
    icon: skill?.icon ?? "",
    tags: skill?.tags ?? [],
    category: skill?.category ?? "",
    version: skill?.version ?? "1.0.0",
    argumentHint: skill?.argumentHint ?? "",
    content: skill?.content ?? "",
    resources: skill?.resources ?? [],
    allowedTools: skill?.allowedTools ?? [],
  };
}
```

3. 在 `description` 字段的 `Textarea` 下方，新增引导文案（找到 description 字段区块）：

```tsx
          <div className="space-y-1.5">
            <Label className="text-xs">{t("description")}</Label>
            <Textarea
              rows={2}
              value={values.description}
              onChange={(e) => update("description", e.target.value)}
              className="text-sm resize-none"
              placeholder="简要描述触发场景和用途..."
            />
            <p className="text-[11px] text-muted-foreground">{t("descriptionHint")}</p>
          </div>
```

4. 在右侧元数据面板的最后（`argumentHint` 字段之后），新增"参考资料"编辑器：

```tsx
          <div className="space-y-1.5">
            <Label className="text-xs">{t("argumentHint")}</Label>
            <Input
              value={values.argumentHint}
              onChange={(e) => update("argumentHint", e.target.value)}
              placeholder="<PRD链接 / 代码路径>"
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t("resources")}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 text-[11px] px-2"
                onClick={() => update("resources", [...values.resources, { title: "", content: "" }])}
              >
                <Plus className="h-3 w-3 mr-1" />
                {t("addResource")}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">{t("resourcesHint")}</p>
            {values.resources.map((resource, i) => (
              <div key={i} className="relative border rounded-md p-2 space-y-1.5">
                <button
                  type="button"
                  onClick={() => update("resources", values.resources.filter((_, idx) => idx !== i))}
                  className="absolute top-1.5 right-1.5 p-0.5 rounded hover:bg-muted text-muted-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
                <Input
                  value={resource.title}
                  onChange={(e) => {
                    const next = values.resources.map((r, idx): SkillResource => idx === i ? { ...r, title: e.target.value } : r);
                    update("resources", next);
                  }}
                  placeholder={t("resourceTitle")}
                  className="h-7 text-xs"
                />
                <Textarea
                  rows={3}
                  value={resource.content}
                  onChange={(e) => {
                    const next = values.resources.map((r, idx): SkillResource => idx === i ? { ...r, content: e.target.value } : r);
                    update("resources", next);
                  }}
                  placeholder={t("resourceContent")}
                  className="text-xs resize-y font-mono"
                />
              </div>
            ))}
          </div>

          <AllowedToolsField
            selected={values.allowedTools}
            onChange={(next) => update("allowedTools", next)}
          />
```

5. 在 `SkillForm` 函数下方（同文件末尾），新增一个私有子组件 `AllowedToolsField`：

```tsx
function AllowedToolsField({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const t = useTranslations("skills.form");
  const { data: allTools } = useCustomTools();

  function toggle(toolName: string) {
    onChange(
      selected.includes(toolName)
        ? selected.filter((n) => n !== toolName)
        : [...selected, toolName],
    );
  }

  if (!allTools || allTools.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{t("allowedTools")}</Label>
      <p className="text-[11px] text-muted-foreground">{t("allowedToolsHint")}</p>
      <div className="space-y-1">
        {allTools.map((tool) => {
          const checked = selected.includes(tool.name);
          return (
            <label key={tool.id} className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(tool.name)}
                className="rounded border-input"
              />
              <span>{tool.displayName}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 新增 i18n key**

在 `messages/zh-CN.json` 的 `skills.form` 命名空间中新增：

```json
"descriptionHint": "写清楚：做什么 + 什么时候用 + 什么时候不用。这段文字会被 AI 用来判断何时调用此技能。",
"resources": "参考资料",
"resourcesHint": "技能正文中可通过\"详见 XXX\"引用，AI 需要时会按需读取。",
"addResource": "添加",
"resourceTitle": "标题",
"resourceContent": "内容",
"allowedTools": "允许搭配的工具",
"allowedToolsHint": "留空表示不限制。勾选后，此技能激活期间，对话只能使用勾选的工具。"
```

在 `messages/en.json` 的 `skills.form` 命名空间中新增：

```json
"descriptionHint": "Write clearly: what it does + when to use it + when NOT to use it. This text is what the AI uses to decide when to invoke this skill.",
"resources": "Reference Resources",
"resourcesHint": "Referenced in the skill body as \"see XXX\"; the AI reads these on demand.",
"addResource": "Add",
"resourceTitle": "Title",
"resourceContent": "Content",
"allowedTools": "Allowed Tools",
"allowedToolsHint": "Leave empty for no restriction. When checked, only the selected tools can be used while this skill is active."
```

- [ ] **Step 3: Commit**

```bash
git add src/components/skills/skill-form.tsx messages/zh-CN.json messages/en.json
git commit -m "feat(ui): add resources editor and allowedTools multi-select to Skill form"
```

---

## Task 12: 验证

无自动化测试覆盖此改动（项目现有测试套件不含 Skill 工具化机制的测试），按 spec 第六节手动验证：

- [ ] **Step 1: 启动开发服务器**

```bash
cd /Users/feng/work/AgentNexus && pnpm run dev
```

- [ ] **Step 2: 创建一个含 resources 和 allowedTools 的 Skill**

在 `/skills/new` 创建一个 Skill，例如"SQL 专家"，`content` 写明"复杂场景详见 QUERY_PATTERNS 参考资料"，添加一条 `resources`（标题 `QUERY_PATTERNS`，内容随意），`allowedTools` 勾选一个工具（如 `weather_query`，仅用于测试拦截，语义不需要匹配）。挂载到某 Agent。

- [ ] **Step 3: 验证不相关问题不加载 Skill**

与该 Agent 对话，发一句明显不相关的问题（如"你好"）。检查该消息的调试面板（Bug 图标）——`skillsInjected` 应为空，且消息气泡下方不应出现 Skill 徽章。

- [ ] **Step 4: 验证相关问题触发加载**

发一句匹配该 Skill 场景的问题（如"帮我写一个复杂的 SQL 查询"）。检查调试面板的"可用的 Tools"里应包含 `load_skill`；如果模型判断相关，工具调用记录（`ToolCallBlock`）应显示"加载技能：SQL 专家"，且消息气泡下方出现该 Skill 的徽章。

- [ ] **Step 5: 验证 allowedTools 拦截**

若上一步模型加载了设置了 `allowedTools` 的 Skill，继续追问一个会触发非允许工具调用的问题，检查该工具调用的 result 是否返回"该工具在当前技能激活期间不可用"的拒绝提示。

- [ ] **Step 6: 验证团队委派场景**

若有配置了团队委派的 Agent，触发一次委派，确认被委派的成员 Agent 若挂载了 Skill，也能通过 `load_skill` 机制正常工作（不再报错、不再全量拼系统提示）。

- [ ] **Step 7: 验证评测场景**

在 Agent 详情页的"评测"区块创建一个评测用例，其 `criteria` 明确要求体现某个已挂载 Skill 的能力，运行评测，检查 `actualOutput` 是否体现了该 Skill 的行为（证明评测执行时 Skill 机制仍然生效）。
