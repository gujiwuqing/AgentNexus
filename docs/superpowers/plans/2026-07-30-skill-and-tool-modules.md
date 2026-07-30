# Skill & Tool 模块实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 AgentNexus 新增 Skill（技能）和 Tool（自定义工具）两个独立模块，支持用户通过 UI 创建、管理、并关联到 Agent，运行时动态注入 system prompt 和 CoreTool。

**Architecture:** 遵循项目现有三层架构（API route → Server service → DB schema）。新增 4 张 DB 表（skills、agent_skills、custom_tools、agent_custom_tools），配套 CRUD 服务层/API/前端页面，并在对话 API 中完成运行时组装。

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Drizzle ORM (MySQL), Vercel AI SDK v4, TanStack Query, Tailwind CSS, shadcn/ui, next-intl, Zod

**Spec:** `docs/superpowers/specs/2026-07-30-skill-and-tool-modules-design.md`

---

## Task 1: 类型定义

**Files:**
- Create: `src/types/skill.ts`
- Create: `src/types/custom-tool.ts`

- [ ] **Step 1: 创建 Skill 类型定义**

```typescript
// src/types/skill.ts
export type SkillExample = {
  input: string;
  output: string;
};

export type Skill = {
  id: string;
  name: string;
  description: string;
  icon: string;
  tags: string[];
  category: string;
  instructions: string;
  examples: SkillExample[];
  recommendedTools: string[];
  createdAt: string;
  updatedAt: string;
};

export type SkillFormValues = {
  name: string;
  description: string;
  icon: string;
  tags: string[];
  category: string;
  instructions: string;
  examples: SkillExample[];
  recommendedTools: string[];
};
```

- [ ] **Step 2: 创建 Custom Tool 类型定义**

```typescript
// src/types/custom-tool.ts
export type HttpToolConfig = {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  bodyTemplate?: string;
  queryTemplate?: Record<string, string>;
};

export type PromptToolConfig = {
  systemInstruction: string;
  outputFormat?: string;
};

export type ToolParameter = {
  name: string;
  type: "string" | "number" | "boolean";
  description: string;
  required: boolean;
  default?: string | number | boolean;
};

export type CustomTool = {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon: string;
  tags: string[];
  type: "http" | "prompt";
  httpConfig: HttpToolConfig | null;
  promptConfig: PromptToolConfig | null;
  parameters: ToolParameter[];
  createdAt: string;
  updatedAt: string;
};

export type CustomToolFormValues = {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  tags: string[];
  type: "http" | "prompt";
  httpConfig: HttpToolConfig | null;
  promptConfig: PromptToolConfig | null;
  parameters: ToolParameter[];
};
```

- [ ] **Step 3: Commit**

```bash
git add src/types/skill.ts src/types/custom-tool.ts
git commit -m "feat(types): add Skill and CustomTool type definitions"
```

---

## Task 2: Validation Schema

**Files:**
- Create: `src/lib/validation/skill.ts`
- Create: `src/lib/validation/custom-tool.ts`

- [ ] **Step 1: 创建 Skill validation schema**

```typescript
// src/lib/validation/skill.ts
import { z } from "zod";

export const skillInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().default(""),
  icon: z.string().default(""),
  tags: z.array(z.string()).default([]),
  category: z.string().default(""),
  instructions: z.string().min(1, "Instructions are required"),
  examples: z.array(z.object({
    input: z.string().min(1),
    output: z.string().min(1),
  })).default([]),
  recommendedTools: z.array(z.string()).default([]),
});

export type SkillInput = z.infer<typeof skillInputSchema>;

export const skillUpdateSchema = skillInputSchema.partial();
export type SkillUpdateInput = z.infer<typeof skillUpdateSchema>;
```

- [ ] **Step 2: 创建 Custom Tool validation schema**

```typescript
// src/lib/validation/custom-tool.ts
import { z } from "zod";

const httpConfigSchema = z.object({
  url: z.string().url("Invalid URL"),
  method: z.enum(["GET", "POST", "PUT", "DELETE"]),
  headers: z.record(z.string()).optional(),
  bodyTemplate: z.string().optional(),
  queryTemplate: z.record(z.string()).optional(),
});

const promptConfigSchema = z.object({
  systemInstruction: z.string().min(1, "System instruction is required"),
  outputFormat: z.string().optional(),
});

const toolParameterSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["string", "number", "boolean"]),
  description: z.string().default(""),
  required: z.boolean().default(true),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

export const customToolInputSchema = z.object({
  name: z.string().min(1, "Name is required").regex(/^[a-z][a-z0-9_]*$/, "Name must be lowercase with underscores"),
  displayName: z.string().min(1, "Display name is required"),
  description: z.string().min(1, "Description is required"),
  icon: z.string().default(""),
  tags: z.array(z.string()).default([]),
  type: z.enum(["http", "prompt"]),
  httpConfig: httpConfigSchema.nullable().default(null),
  promptConfig: promptConfigSchema.nullable().default(null),
  parameters: z.array(toolParameterSchema).default([]),
});

export type CustomToolInput = z.infer<typeof customToolInputSchema>;

export const customToolUpdateSchema = customToolInputSchema.partial();
export type CustomToolUpdateInput = z.infer<typeof customToolUpdateSchema>;
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/validation/skill.ts src/lib/validation/custom-tool.ts
git commit -m "feat(validation): add Skill and CustomTool Zod schemas"
```

---

## Task 3: 数据库 Schema

**Files:**
- Modify: `src/db/schema.ts`（在文件末尾追加 4 张新表）

- [ ] **Step 1: 在 schema.ts 末尾新增 skills 表和 agent_skills 关联表**

在 `src/db/schema.ts` 文件的最后（`sessions` 表之后）追加：

```typescript
export const skills = mysqlTable("skills", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
  userId: varchar("user_id", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 255 }).notNull().default(""),
  tags: json("tags").notNull().$type<string[]>().default([]),
  category: varchar("category", { length: 50 }).notNull().default(""),
  instructions: text("instructions").notNull(),
  examples: json("examples").notNull().$type<Array<{ input: string; output: string }>>().default([]),
  recommendedTools: json("recommended_tools").notNull().$type<string[]>().default([]),
  createdAt: timestamp("created_at", { mode: "date", fsp: 6 })
    .notNull().defaultNow().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at", { mode: "date", fsp: 6 })
    .notNull().defaultNow().$defaultFn(() => new Date()),
});

export const agentSkills = mysqlTable("agent_skills", {
  agentId: varchar("agent_id", { length: 36 }).notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  skillId: varchar("skill_id", { length: 36 }).notNull()
    .references(() => skills.id, { onDelete: "cascade" }),
});
```

- [ ] **Step 2: 在 schema.ts 末尾新增 custom_tools 表和 agent_custom_tools 关联表**

继续在 `src/db/schema.ts` 末尾追加：

```typescript
export const customTools = mysqlTable("custom_tools", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
  userId: varchar("user_id", { length: 36 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 255 }).notNull().default(""),
  tags: json("tags").notNull().$type<string[]>().default([]),
  type: mysqlEnum("type", ["http", "prompt"]).notNull(),
  httpConfig: json("http_config").$type<{
    url: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    headers?: Record<string, string>;
    bodyTemplate?: string;
    queryTemplate?: Record<string, string>;
  } | null>(),
  promptConfig: json("prompt_config").$type<{
    systemInstruction: string;
    outputFormat?: string;
  } | null>(),
  parameters: json("parameters").notNull().$type<Array<{
    name: string;
    type: "string" | "number" | "boolean";
    description: string;
    required: boolean;
    default?: string | number | boolean;
  }>>().default([]),
  createdAt: timestamp("created_at", { mode: "date", fsp: 6 })
    .notNull().defaultNow().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at", { mode: "date", fsp: 6 })
    .notNull().defaultNow().$defaultFn(() => new Date()),
});

export const agentCustomTools = mysqlTable("agent_custom_tools", {
  agentId: varchar("agent_id", { length: 36 }).notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  toolId: varchar("tool_id", { length: 36 }).notNull()
    .references(() => customTools.id, { onDelete: "cascade" }),
});
```

- [ ] **Step 3: 推送 schema 到数据库**

```bash
pnpm run db:push
```

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat(db): add skills, agent_skills, custom_tools, agent_custom_tools tables"
```

---

## Task 4: 服务层 — Skills CRUD

**Files:**
- Create: `src/server/skills.ts`

- [ ] **Step 1: 实现 Skills 服务层**

```typescript
// src/server/skills.ts
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { skills } from "@/db/schema";
import { createId } from "@/lib/id";
import type { SkillInput, SkillUpdateInput } from "@/lib/validation/skill";

export async function createSkill(input: SkillInput, userId: string) {
  const id = createId();
  await db.insert(skills).values({ ...input, id, userId });
  return getSkill(id);
}

export async function listSkills(userId: string) {
  return db.select().from(skills).where(eq(skills.userId, userId));
}

export async function getSkill(id: string) {
  const [row] = await db.select().from(skills).where(eq(skills.id, id));
  return row ?? null;
}

export async function getSkillOwnedBy(id: string, userId: string) {
  const [row] = await db.select().from(skills).where(and(eq(skills.id, id), eq(skills.userId, userId)));
  return row ?? null;
}

export async function updateSkill(id: string, input: SkillUpdateInput, userId: string) {
  const existing = await getSkillOwnedBy(id, userId);
  if (!existing) return null;
  await db.update(skills).set({ ...input, updatedAt: new Date() }).where(eq(skills.id, id));
  return getSkill(id);
}

export async function deleteSkill(id: string, userId: string) {
  const existing = await getSkillOwnedBy(id, userId);
  if (!existing) return false;
  await db.delete(skills).where(eq(skills.id, id));
  return true;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/server/skills.ts
git commit -m "feat(server): add Skills CRUD service"
```

---

## Task 5: 服务层 — Custom Tools CRUD

**Files:**
- Create: `src/server/custom-tools.ts`

- [ ] **Step 1: 实现 Custom Tools 服务层**

```typescript
// src/server/custom-tools.ts
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { customTools } from "@/db/schema";
import { createId } from "@/lib/id";
import type { CustomToolInput, CustomToolUpdateInput } from "@/lib/validation/custom-tool";

export async function createCustomTool(input: CustomToolInput, userId: string) {
  const id = createId();
  await db.insert(customTools).values({ ...input, id, userId });
  return getCustomTool(id);
}

export async function listCustomTools(userId: string) {
  return db.select().from(customTools).where(eq(customTools.userId, userId));
}

export async function getCustomTool(id: string) {
  const [row] = await db.select().from(customTools).where(eq(customTools.id, id));
  return row ?? null;
}

export async function getCustomToolOwnedBy(id: string, userId: string) {
  const [row] = await db.select().from(customTools).where(and(eq(customTools.id, id), eq(customTools.userId, userId)));
  return row ?? null;
}

export async function updateCustomTool(id: string, input: CustomToolUpdateInput, userId: string) {
  const existing = await getCustomToolOwnedBy(id, userId);
  if (!existing) return null;
  await db.update(customTools).set({ ...input, updatedAt: new Date() }).where(eq(customTools.id, id));
  return getCustomTool(id);
}

export async function deleteCustomTool(id: string, userId: string) {
  const existing = await getCustomToolOwnedBy(id, userId);
  if (!existing) return false;
  await db.delete(customTools).where(eq(customTools.id, id));
  return true;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/server/custom-tools.ts
git commit -m "feat(server): add Custom Tools CRUD service"
```

---

## Task 6: 服务层 — Agent 关联

**Files:**
- Create: `src/server/agent-skills.ts`
- Create: `src/server/agent-custom-tools.ts`

- [ ] **Step 1: 实现 Agent-Skills 关联服务**

参照现有 `src/server/agent-knowledge.ts` 的模式：

```typescript
// src/server/agent-skills.ts
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { agentSkills, skills } from "@/db/schema";

export async function getAgentSkillIds(agentId: string): Promise<string[]> {
  const rows = await db
    .select({ skillId: agentSkills.skillId })
    .from(agentSkills)
    .where(eq(agentSkills.agentId, agentId));
  return rows.map((r) => r.skillId);
}

export async function getAgentSkills(agentId: string) {
  const rows = await db
    .select({
      id: skills.id,
      name: skills.name,
      description: skills.description,
      icon: skills.icon,
      category: skills.category,
      instructions: skills.instructions,
      examples: skills.examples,
    })
    .from(agentSkills)
    .innerJoin(skills, eq(agentSkills.skillId, skills.id))
    .where(eq(agentSkills.agentId, agentId));
  return rows;
}

export async function setAgentSkills(agentId: string, skillIds: string[], userId: string) {
  await db.delete(agentSkills).where(eq(agentSkills.agentId, agentId));
  if (skillIds.length > 0) {
    const owned = await db
      .select({ id: skills.id })
      .from(skills)
      .where(eq(skills.userId, userId));
    const ownedIds = new Set(owned.map((r) => r.id));
    const valid = skillIds.filter((id) => ownedIds.has(id));
    if (valid.length > 0) {
      await db.insert(agentSkills).values(
        valid.map((skillId) => ({ agentId, skillId })),
      );
    }
  }
}
```

- [ ] **Step 2: 实现 Agent-Custom-Tools 关联服务**

```typescript
// src/server/agent-custom-tools.ts
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agentCustomTools, customTools } from "@/db/schema";

export async function getAgentCustomToolIds(agentId: string): Promise<string[]> {
  const rows = await db
    .select({ toolId: agentCustomTools.toolId })
    .from(agentCustomTools)
    .where(eq(agentCustomTools.agentId, agentId));
  return rows.map((r) => r.toolId);
}

export async function getAgentCustomTools(agentId: string) {
  const rows = await db
    .select()
    .from(agentCustomTools)
    .innerJoin(customTools, eq(agentCustomTools.toolId, customTools.id))
    .where(eq(agentCustomTools.agentId, agentId));
  return rows.map((r) => r.custom_tools);
}

export async function setAgentCustomTools(agentId: string, toolIds: string[], userId: string) {
  await db.delete(agentCustomTools).where(eq(agentCustomTools.agentId, agentId));
  if (toolIds.length > 0) {
    const owned = await db
      .select({ id: customTools.id })
      .from(customTools)
      .where(eq(customTools.userId, userId));
    const ownedIds = new Set(owned.map((r) => r.id));
    const valid = toolIds.filter((id) => ownedIds.has(id));
    if (valid.length > 0) {
      await db.insert(agentCustomTools).values(
        valid.map((toolId) => ({ agentId, toolId })),
      );
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/server/agent-skills.ts src/server/agent-custom-tools.ts
git commit -m "feat(server): add Agent-Skills and Agent-CustomTools association services"
```

---

## Task 7: API 路由 — Skills CRUD

**Files:**
- Create: `src/app/api/skills/route.ts`
- Create: `src/app/api/skills/[id]/route.ts`

- [ ] **Step 1: Skills 列表 + 创建路由**

```typescript
// src/app/api/skills/route.ts
import { skillInputSchema } from "@/lib/validation/skill";
import { createSkill, listSkills } from "@/server/skills";
import { apiOk, apiError } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const all = await listSkills(user.id);
  return apiOk(all);
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body = await request.json();
  const parsed = skillInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "validation_error", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const created = await createSkill(parsed.data, user.id);
  return apiOk(created, 201);
}
```

- [ ] **Step 2: Skills 单条获取 + 更新 + 删除路由**

```typescript
// src/app/api/skills/[id]/route.ts
import { skillUpdateSchema } from "@/lib/validation/skill";
import { getSkillOwnedBy, updateSkill, deleteSkill } from "@/server/skills";
import { apiOk, apiError } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const skill = await getSkillOwnedBy(id, user.id);
  if (!skill) return apiError(404, "not_found", "Skill not found");
  return apiOk(skill);
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const body = await request.json();
  const parsed = skillUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "validation_error", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const updated = await updateSkill(id, parsed.data, user.id);
  if (!updated) return apiError(404, "not_found", "Skill not found");
  return apiOk(updated);
}

export async function DELETE(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const deleted = await deleteSkill(id, user.id);
  if (!deleted) return apiError(404, "not_found", "Skill not found");
  return new Response(null, { status: 204 });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/skills/
git commit -m "feat(api): add Skills CRUD routes"
```

---

## Task 8: API 路由 — Custom Tools CRUD

**Files:**
- Create: `src/app/api/custom-tools/route.ts`
- Create: `src/app/api/custom-tools/[id]/route.ts`

- [ ] **Step 1: Custom Tools 列表 + 创建路由**

```typescript
// src/app/api/custom-tools/route.ts
import { customToolInputSchema } from "@/lib/validation/custom-tool";
import { createCustomTool, listCustomTools } from "@/server/custom-tools";
import { apiOk, apiError } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const all = await listCustomTools(user.id);
  return apiOk(all);
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body = await request.json();
  const parsed = customToolInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "validation_error", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const created = await createCustomTool(parsed.data, user.id);
  return apiOk(created, 201);
}
```

- [ ] **Step 2: Custom Tools 单条获取 + 更新 + 删除路由**

```typescript
// src/app/api/custom-tools/[id]/route.ts
import { customToolUpdateSchema } from "@/lib/validation/custom-tool";
import { getCustomToolOwnedBy, updateCustomTool, deleteCustomTool } from "@/server/custom-tools";
import { apiOk, apiError } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const tool = await getCustomToolOwnedBy(id, user.id);
  if (!tool) return apiError(404, "not_found", "Custom tool not found");
  return apiOk(tool);
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const body = await request.json();
  const parsed = customToolUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "validation_error", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const updated = await updateCustomTool(id, parsed.data, user.id);
  if (!updated) return apiError(404, "not_found", "Custom tool not found");
  return apiOk(updated);
}

export async function DELETE(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const deleted = await deleteCustomTool(id, user.id);
  if (!deleted) return apiError(404, "not_found", "Custom tool not found");
  return new Response(null, { status: 204 });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/custom-tools/
git commit -m "feat(api): add Custom Tools CRUD routes"
```

---

## Task 9: API 路由 — Agent 关联

**Files:**
- Create: `src/app/api/agents/[id]/skills/route.ts`
- Create: `src/app/api/agents/[id]/custom-tools/route.ts`

- [ ] **Step 1: Agent-Skills 关联路由**

参照现有 `src/app/api/agents/[id]/knowledge-bases/route.ts`：

```typescript
// src/app/api/agents/[id]/skills/route.ts
import { apiOk, apiError } from "@/lib/api-response";
import { getAgentOwnedBy } from "@/server/agents";
import { getAgentSkills, setAgentSkills } from "@/server/agent-skills";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const agent = await getAgentOwnedBy(id, user.id);
  if (!agent) return apiError(404, "not_found", "Agent not found");
  const agentSkills = await getAgentSkills(id);
  return apiOk(agentSkills);
}

export async function PUT(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const agent = await getAgentOwnedBy(id, user.id);
  if (!agent) return apiError(404, "not_found", "Agent not found");
  const body = await request.json();
  const skillIds: string[] = Array.isArray(body?.skillIds) ? body.skillIds : [];
  await setAgentSkills(id, skillIds, user.id);
  const result = await getAgentSkills(id);
  return apiOk(result);
}
```

- [ ] **Step 2: Agent-Custom-Tools 关联路由**

```typescript
// src/app/api/agents/[id]/custom-tools/route.ts
import { apiOk, apiError } from "@/lib/api-response";
import { getAgentOwnedBy } from "@/server/agents";
import { getAgentCustomTools, setAgentCustomTools } from "@/server/agent-custom-tools";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const agent = await getAgentOwnedBy(id, user.id);
  if (!agent) return apiError(404, "not_found", "Agent not found");
  const tools = await getAgentCustomTools(id);
  return apiOk(tools);
}

export async function PUT(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const agent = await getAgentOwnedBy(id, user.id);
  if (!agent) return apiError(404, "not_found", "Agent not found");
  const body = await request.json();
  const toolIds: string[] = Array.isArray(body?.toolIds) ? body.toolIds : [];
  await setAgentCustomTools(id, toolIds, user.id);
  const result = await getAgentCustomTools(id);
  return apiOk(result);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/agents/[id]/skills/ src/app/api/agents/[id]/custom-tools/
git commit -m "feat(api): add Agent-Skills and Agent-CustomTools association routes"
```

---

## Task 10: 运行时 — Skill prompt 构建 + Custom Tool 解析

**Files:**
- Create: `src/lib/skills/prompt-builder.ts`
- Create: `src/lib/tools/custom-resolve.ts`
- Modify: `src/lib/tools/resolve.ts`

- [ ] **Step 1: 创建 Skill prompt 构建函数**

```typescript
// src/lib/skills/prompt-builder.ts

type SkillForPrompt = {
  name: string;
  instructions: string;
  examples: Array<{ input: string; output: string }>;
};

export function buildSkillSystemPrompt(skills: SkillForPrompt[]): string {
  if (skills.length === 0) return "";

  const sections = skills.map((skill) => {
    let section = `## 技能：${skill.name}\n${skill.instructions}`;
    if (skill.examples.length > 0) {
      section += "\n\n参考示例：";
      for (const ex of skill.examples) {
        section += `\n用户：${ex.input}\n助手：${ex.output}`;
      }
    }
    return section;
  });

  return "\n\n---\n你具备以下专业技能，请在相关任务中自动运用：\n\n" + sections.join("\n\n");
}
```

- [ ] **Step 2: 创建 Custom Tool 运行时解析函数**

```typescript
// src/lib/tools/custom-resolve.ts
import { tool, type CoreTool } from "ai";
import { z } from "zod";
import type { ToolParameter } from "@/types/custom-tool";

type CustomToolRow = {
  name: string;
  description: string;
  type: "http" | "prompt";
  httpConfig: {
    url: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    headers?: Record<string, string>;
    bodyTemplate?: string;
    queryTemplate?: Record<string, string>;
  } | null;
  promptConfig: {
    systemInstruction: string;
    outputFormat?: string;
  } | null;
  parameters: ToolParameter[];
};

function buildZodSchema(parameters: ToolParameter[]): z.ZodSchema {
  if (parameters.length === 0) return z.object({});
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const p of parameters) {
    let field: z.ZodTypeAny;
    if (p.type === "number") field = z.number().describe(p.description);
    else if (p.type === "boolean") field = z.boolean().describe(p.description);
    else field = z.string().describe(p.description);
    if (p.default !== undefined) field = field.default(p.default);
    if (!p.required) field = field.optional();
    shape[p.name] = field;
  }
  return z.object(shape);
}

function interpolate(template: string, params: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = params[key];
    return val !== undefined ? String(val) : "";
  });
}

function interpolateRecord(template: Record<string, string>, params: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(template)) {
    result[k] = interpolate(v, params);
  }
  return result;
}

export function resolveCustomTools(customTools: CustomToolRow[]): Record<string, CoreTool> {
  const result: Record<string, CoreTool> = {};

  for (const t of customTools) {
    const schema = buildZodSchema(t.parameters);

    if (t.type === "http" && t.httpConfig) {
      const config = t.httpConfig;
      result[t.name] = tool({
        description: t.description,
        parameters: schema,
        execute: async (params) => {
          try {
            const url = new URL(interpolate(config.url, params));
            if (config.queryTemplate) {
              const query = interpolateRecord(config.queryTemplate, params);
              for (const [k, v] of Object.entries(query)) {
                if (v) url.searchParams.set(k, v);
              }
            }
            const headers: Record<string, string> = config.headers
              ? interpolateRecord(config.headers, params)
              : {};
            const fetchOpts: RequestInit = { method: config.method, headers };
            if (config.bodyTemplate && config.method !== "GET") {
              fetchOpts.body = interpolate(config.bodyTemplate, params);
              if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
            }
            const res = await fetch(url.toString(), fetchOpts);
            const text = await res.text();
            return text.slice(0, 10000);
          } catch (err) {
            return JSON.stringify({ error: err instanceof Error ? err.message : "HTTP request failed" });
          }
        },
      });
    } else if (t.type === "prompt" && t.promptConfig) {
      const config = t.promptConfig;
      result[t.name] = tool({
        description: t.description,
        parameters: schema,
        execute: async (params) => {
          const format = config.outputFormat ? `\n输出格式：${config.outputFormat}` : "";
          return `请按以下规则处理：${config.systemInstruction}${format}\n输入：${JSON.stringify(params)}`;
        },
      });
    }
  }

  return result;
}
```

- [ ] **Step 3: 扩展 resolveAgentTools 签名**

修改 `src/lib/tools/resolve.ts`，在函数签名中新增 `customToolRows` 参数，并在 tools 合并中调用 `resolveCustomTools`：

在文件顶部新增 import：
```typescript
import { resolveCustomTools } from "./custom-resolve";
import type { ToolParameter } from "@/types/custom-tool";
```

修改 `resolveAgentTools` 函数签名和实现——在 `teamToolDefs` 参数之前新增 `customToolRows` 参数：

```typescript
export function resolveAgentTools(
  enabledTools: string[],
  searchConfig?: { provider: string; apiKey: string } | null,
  customToolRows?: Array<{
    name: string;
    description: string;
    type: "http" | "prompt";
    httpConfig: unknown;
    promptConfig: unknown;
    parameters: ToolParameter[];
  }>,
  teamToolDefs?: ToolDefinition[],
): Record<string, CoreTool> | undefined {
  if (enabledTools.length === 0 && (!customToolRows || customToolRows.length === 0) && (!teamToolDefs || teamToolDefs.length === 0)) return undefined;

  const tools: Record<string, CoreTool> = {};

  // 内置工具（现有逻辑不变）
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

  // 自定义工具（新增）
  if (customToolRows && customToolRows.length > 0) {
    Object.assign(tools, resolveCustomTools(customToolRows as Parameters<typeof resolveCustomTools>[0]));
  }

  // 团队委派工具（现有逻辑不变）
  for (const def of teamToolDefs ?? []) {
    tools[def.name] = tool({
      description: def.description,
      parameters: def.parameters,
      execute: def.execute,
    });
  }

  return Object.keys(tools).length > 0 ? tools : undefined;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/skills/prompt-builder.ts src/lib/tools/custom-resolve.ts src/lib/tools/resolve.ts
git commit -m "feat(runtime): add Skill prompt builder and Custom Tool resolver"
```

---

## Task 11: 运行时 — 对话 API 集成

**Files:**
- Modify: `src/app/api/conversations/[id]/messages/route.ts`

- [ ] **Step 1: 在对话 API 中注入 Skills 和 Custom Tools**

在 `src/app/api/conversations/[id]/messages/route.ts` 中：

顶部新增 import：
```typescript
import { getAgentSkills } from "@/server/agent-skills";
import { getAgentCustomTools } from "@/server/agent-custom-tools";
import { buildSkillSystemPrompt } from "@/lib/skills/prompt-builder";
```

在构建 `chatMessages` 之后、RAG 注入之前（约第62行 `const chatMessages` 之后），插入 Skill 注入逻辑：

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

在构建 tools 时（约第80行 `const tools = resolveAgentTools(...)` 处），替换为包含 Custom Tools 的调用：

```typescript
  // 查出关联的自定义工具
  const agentCustomToolRows = await getAgentCustomTools(agent.id);
  const tools = resolveAgentTools(enabledTools, searchConfig, agentCustomToolRows, teamToolDefs);
```

在 `onFinish` 回调中的 `enrichedToolCalls` 映射逻辑中，为自定义工具补充 displayName：

在现有的 `if (tc.toolName.startsWith("delegate_to_"))` 分支之后、`const builtin = getToolByName(tc.toolName)` 之前，新增：
```typescript
        const customTool = agentCustomToolRows.find((ct) => ct.name === tc.toolName);
        if (customTool) {
          return { ...tc, displayName: customTool.displayName };
        }
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/conversations/[id]/messages/route.ts
git commit -m "feat(chat): integrate Skills prompt injection and Custom Tools into conversation API"
```

---

## Task 12: 前端 — TanStack Query Hooks

**Files:**
- Create: `src/hooks/use-skills.ts`
- Create: `src/hooks/use-custom-tools.ts`

- [ ] **Step 1: Skills hooks**

```typescript
// src/hooks/use-skills.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Skill, SkillFormValues } from "@/types/skill";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function useSkills() {
  return useQuery({ queryKey: ["skills"], queryFn: () => fetchJson<Skill[]>("/api/skills") });
}

export function useSkill(id: string) {
  return useQuery({
    queryKey: ["skills", id],
    queryFn: () => fetchJson<Skill>(`/api/skills/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SkillFormValues) =>
      fetchJson<Skill>("/api/skills", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills"] }),
  });
}

export function useUpdateSkill(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<SkillFormValues>) =>
      fetchJson<Skill>(`/api/skills/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["skills"] });
      qc.invalidateQueries({ queryKey: ["skills", id] });
    },
  });
}

export function useDeleteSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJson<void>(`/api/skills/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills"] }),
  });
}

export function useAgentSkills(agentId: string) {
  return useQuery({
    queryKey: ["agent-skills", agentId],
    queryFn: () => fetchJson<Array<{ id: string; name: string; description: string; icon: string; category: string }>>(`/api/agents/${agentId}/skills`),
    enabled: !!agentId,
  });
}

export function useSetAgentSkills(agentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (skillIds: string[]) => {
      const res = await fetch(`/api/agents/${agentId}/skills`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ skillIds }),
      });
      if (!res.ok) throw new Error("Failed to update");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-skills", agentId] }),
  });
}
```

- [ ] **Step 2: Custom Tools hooks**

```typescript
// src/hooks/use-custom-tools.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CustomTool, CustomToolFormValues } from "@/types/custom-tool";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function useCustomTools() {
  return useQuery({ queryKey: ["custom-tools"], queryFn: () => fetchJson<CustomTool[]>("/api/custom-tools") });
}

export function useCustomTool(id: string) {
  return useQuery({
    queryKey: ["custom-tools", id],
    queryFn: () => fetchJson<CustomTool>(`/api/custom-tools/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateCustomTool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomToolFormValues) =>
      fetchJson<CustomTool>("/api/custom-tools", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom-tools"] }),
  });
}

export function useUpdateCustomTool(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CustomToolFormValues>) =>
      fetchJson<CustomTool>(`/api/custom-tools/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-tools"] });
      qc.invalidateQueries({ queryKey: ["custom-tools", id] });
    },
  });
}

export function useDeleteCustomTool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJson<void>(`/api/custom-tools/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom-tools"] }),
  });
}

export function useAgentCustomTools(agentId: string) {
  return useQuery({
    queryKey: ["agent-custom-tools", agentId],
    queryFn: () => fetchJson<CustomTool[]>(`/api/agents/${agentId}/custom-tools`),
    enabled: !!agentId,
  });
}

export function useSetAgentCustomTools(agentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (toolIds: string[]) => {
      const res = await fetch(`/api/agents/${agentId}/custom-tools`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ toolIds }),
      });
      if (!res.ok) throw new Error("Failed to update");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-custom-tools", agentId] }),
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-skills.ts src/hooks/use-custom-tools.ts
git commit -m "feat(hooks): add Skills and Custom Tools TanStack Query hooks"
```

---

## Task 13: 国际化 + 导航

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/zh-CN.json`
- Modify: `src/components/nav/primary-sidebar.tsx`

- [ ] **Step 1: 在 en.json 中新增 skills 和 customTools 命名空间**

在 `messages/en.json` 的顶层对象中新增两个 key（与 `agents`、`knowledge` 同级）：

```json
"skills": {
  "title": "Skills",
  "create": "New Skill",
  "edit": "Edit Skill",
  "delete": "Delete Skill",
  "deleteConfirm": "Are you sure you want to delete this skill?",
  "empty": "No skills yet. Create one to get started.",
  "saved": "Skill saved",
  "notFound": "Skill not found",
  "form": {
    "name": "Name",
    "description": "Description",
    "icon": "Icon",
    "tags": "Tags",
    "category": "Category",
    "instructions": "Instructions",
    "instructionsHint": "Core prompt instructions that define this skill's behavior",
    "examples": "Examples",
    "examplesHint": "Few-shot examples to help the AI understand expected behavior",
    "addExample": "Add Example",
    "exampleInput": "User Input",
    "exampleOutput": "Expected Output",
    "recommendedTools": "Recommended Tools"
  },
  "categories": {
    "development": "Development",
    "writing": "Writing",
    "analysis": "Analysis",
    "communication": "Communication",
    "other": "Other"
  }
},
"customTools": {
  "title": "Tools",
  "create": "New Tool",
  "edit": "Edit Tool",
  "delete": "Delete Tool",
  "deleteConfirm": "Are you sure you want to delete this tool?",
  "empty": "No custom tools yet. Create one to get started.",
  "saved": "Tool saved",
  "notFound": "Tool not found",
  "form": {
    "name": "Name (identifier)",
    "nameHint": "Lowercase with underscores, e.g. weather_query",
    "displayName": "Display Name",
    "description": "Description",
    "descriptionHint": "Describe what this tool does — this is shown to the AI",
    "icon": "Icon",
    "tags": "Tags",
    "type": "Type",
    "typeHttp": "HTTP Request",
    "typePrompt": "Prompt Instruction",
    "url": "URL",
    "method": "Method",
    "headers": "Headers (JSON)",
    "bodyTemplate": "Body Template",
    "queryTemplate": "Query Parameters",
    "systemInstruction": "System Instruction",
    "outputFormat": "Output Format",
    "parameters": "Parameters",
    "addParameter": "Add Parameter",
    "paramName": "Name",
    "paramType": "Type",
    "paramDescription": "Description",
    "paramRequired": "Required",
    "paramDefault": "Default"
  }
}
```

在 `nav` 命名空间中新增：
```json
"skills": "Skills",
"tools": "Tools"
```

- [ ] **Step 2: 在 zh-CN.json 中新增对应翻译**

```json
"skills": {
  "title": "技能",
  "create": "新建技能",
  "edit": "编辑技能",
  "delete": "删除技能",
  "deleteConfirm": "确定要删除此技能吗？",
  "empty": "暂无技能，点击创建开始使用。",
  "saved": "技能已保存",
  "notFound": "技能不存在",
  "form": {
    "name": "名称",
    "description": "描述",
    "icon": "图标",
    "tags": "标签",
    "category": "分类",
    "instructions": "指令",
    "instructionsHint": "定义该技能行为的核心提示词指令",
    "examples": "示例",
    "examplesHint": "输入/输出示例对，帮助 AI 理解预期行为",
    "addExample": "添加示例",
    "exampleInput": "用户输入",
    "exampleOutput": "预期输出",
    "recommendedTools": "推荐工具"
  },
  "categories": {
    "development": "开发",
    "writing": "写作",
    "analysis": "分析",
    "communication": "沟通",
    "other": "其他"
  }
},
"customTools": {
  "title": "工具",
  "create": "新建工具",
  "edit": "编辑工具",
  "delete": "删除工具",
  "deleteConfirm": "确定要删除此工具吗？",
  "empty": "暂无自定义工具，点击创建开始使用。",
  "saved": "工具已保存",
  "notFound": "工具不存在",
  "form": {
    "name": "名称（标识符）",
    "nameHint": "小写字母加下划线，如 weather_query",
    "displayName": "显示名称",
    "description": "描述",
    "descriptionHint": "描述工具的功能——这会展示给 AI",
    "icon": "图标",
    "tags": "标签",
    "type": "类型",
    "typeHttp": "HTTP 请求",
    "typePrompt": "Prompt 指令",
    "url": "URL",
    "method": "方法",
    "headers": "请求头（JSON）",
    "bodyTemplate": "请求体模板",
    "queryTemplate": "查询参数",
    "systemInstruction": "系统指令",
    "outputFormat": "输出格式",
    "parameters": "参数",
    "addParameter": "添加参数",
    "paramName": "名称",
    "paramType": "类型",
    "paramDescription": "描述",
    "paramRequired": "必填",
    "paramDefault": "默认值"
  }
}
```

在 `nav` 命名空间中新增：
```json
"skills": "技能",
"tools": "工具"
```

- [ ] **Step 3: 在侧边栏导航中新增 Skills 和 Tools 入口**

修改 `src/components/nav/primary-sidebar.tsx`：

顶部 import 新增图标：
```typescript
import { MessagesSquare, Bot, LayoutDashboard, Workflow, BookOpen, Settings, Sparkles, Menu, X, Zap, Wrench } from "lucide-react";
```

在 `NAV_ITEMS` 数组中，`knowledge` 之后新增两项：
```typescript
const NAV_ITEMS = [
  { href: "/chat", key: "chat", icon: MessagesSquare },
  { href: "/agents", key: "agents", icon: Bot },
  { href: "/workflows", key: "workflows", icon: Workflow },
  { href: "/knowledge", key: "knowledge", icon: BookOpen },
  { href: "/skills", key: "skills", icon: Zap },
  { href: "/tools", key: "tools", icon: Wrench },
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
] as const;
```

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/zh-CN.json src/components/nav/primary-sidebar.tsx
git commit -m "feat(i18n,nav): add Skills and Tools translations and sidebar navigation"
```

---

## Task 14: 前端 — Skills 组件

**Files:**
- Create: `src/components/skills/skill-card.tsx`
- Create: `src/components/skills/skill-form.tsx`
- Create: `src/components/skills/skill-examples-editor.tsx`
- Create: `src/components/skills/delete-skill-button.tsx`

本 Task 创建 4 个组件文件。由于组件代码较长，具体实现参照以下模式：

- `skill-card.tsx`：参照 `src/components/agents/agent-card.tsx` 的卡片布局模式，展示 icon + name + description + tags + category 标签
- `skill-form.tsx`：参照 `src/components/agents/agent-form.tsx` 的表单模式，包含 name、description、icon、tags、category（下拉选择）、instructions（大文本框）、examples（使用 SkillExamplesEditor 子组件）、recommendedTools 字段
- `skill-examples-editor.tsx`：可增删的输入/输出对列表。每行包含两个 Textarea（input 和 output），底部有"添加示例"按钮
- `delete-skill-button.tsx`：参照 `src/components/agents/delete-agent-button.tsx`，确认弹窗后调用 `useDeleteSkill`

- [ ] **Step 1: 创建 skill-card.tsx**
- [ ] **Step 2: 创建 skill-examples-editor.tsx**
- [ ] **Step 3: 创建 skill-form.tsx**
- [ ] **Step 4: 创建 delete-skill-button.tsx**
- [ ] **Step 5: Commit**

```bash
git add src/components/skills/
git commit -m "feat(ui): add Skills components — card, form, examples editor, delete button"
```

---

## Task 15: 前端 — Skills 页面

**Files:**
- Create: `src/app/(app)/skills/page.tsx`
- Create: `src/app/(app)/skills/new/page.tsx`
- Create: `src/app/(app)/skills/[id]/page.tsx`

- [ ] **Step 1: Skills 列表页**

参照 `src/app/(app)/agents/page.tsx`（或 `src/app/(app)/knowledge/page.tsx`）的模式：查询 `useSkills()`，展示卡片网格，右上角有"新建技能"按钮，点击跳转 `/skills/new`，点击卡片跳转 `/skills/[id]`。

- [ ] **Step 2: 新建 Skill 页面**

参照 `src/app/(app)/agents/new/page.tsx`：使用 `SkillForm` 组件，提交调用 `useCreateSkill`，成功后跳转到 `/skills/[id]`。

- [ ] **Step 3: 编辑 Skill 页面**

参照 `src/app/(app)/agents/[id]/page.tsx`：使用 `useSkill(id)` 查询，`SkillForm` 编辑，提交调用 `useUpdateSkill`，页面底部放 `DeleteSkillButton`。

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/skills/
git commit -m "feat(pages): add Skills list, create, and edit pages"
```

---

## Task 16: 前端 — Tools 组件

**Files:**
- Create: `src/components/tools/tool-card.tsx`
- Create: `src/components/tools/tool-form.tsx`
- Create: `src/components/tools/tool-parameters-editor.tsx`
- Create: `src/components/tools/delete-tool-button.tsx`

- [ ] **Step 1: 创建 tool-card.tsx**

参照 `skill-card.tsx`，额外显示 type 标签（HTTP / Prompt）。

- [ ] **Step 2: 创建 tool-parameters-editor.tsx**

可增删的参数行列表。每行包含 name（Input）、type（Select: string/number/boolean）、description（Input）、required（Checkbox）、default（Input）字段，底部有"添加参数"按钮。

- [ ] **Step 3: 创建 tool-form.tsx**

参照 `skill-form.tsx`，核心差异：
- `type` 字段用 radio 或 select 切换 HTTP / Prompt
- 当 `type === "http"` 时展示 httpConfig 表单区块（url、method、headers、bodyTemplate、queryTemplate）
- 当 `type === "prompt"` 时展示 promptConfig 表单区块（systemInstruction、outputFormat）
- parameters 区块使用 `ToolParametersEditor` 子组件

- [ ] **Step 4: 创建 delete-tool-button.tsx**
- [ ] **Step 5: Commit**

```bash
git add src/components/tools/
git commit -m "feat(ui): add Tools components — card, form, parameters editor, delete button"
```

---

## Task 17: 前端 — Tools 页面

**Files:**
- Create: `src/app/(app)/tools/page.tsx`
- Create: `src/app/(app)/tools/new/page.tsx`
- Create: `src/app/(app)/tools/[id]/page.tsx`

- [ ] **Step 1: Tools 列表页**
- [ ] **Step 2: 新建 Tool 页面**
- [ ] **Step 3: 编辑 Tool 页面**
- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/tools/
git commit -m "feat(pages): add Tools list, create, and edit pages"
```

---

## Task 18: 前端 — Agent 配置集成

**Files:**
- Create: `src/components/agents/agent-skills-config.tsx`
- Create: `src/components/agents/agent-custom-tools-config.tsx`
- Modify: `src/app/(app)/agents/[id]/page.tsx`

- [ ] **Step 1: 创建 agent-skills-config.tsx**

参照 `src/components/agents/agent-knowledge-config.tsx` 的模式：

```typescript
// src/components/agents/agent-skills-config.tsx
"use client";

import { useTranslations } from "next-intl";
import { Zap } from "lucide-react";
import { useSkills, useAgentSkills, useSetAgentSkills } from "@/hooks/use-skills";

export function AgentSkillsConfig({ agentId }: { agentId: string }) {
  const t = useTranslations("skills");
  const { data: allSkills } = useSkills();
  const { data: linked } = useAgentSkills(agentId);
  const setLinked = useSetAgentSkills(agentId);

  const selectedIds = (linked ?? []).map((s) => s.id);

  function toggle(skillId: string) {
    const next = selectedIds.includes(skillId)
      ? selectedIds.filter((id) => id !== skillId)
      : [...selectedIds, skillId];
    setLinked.mutate(next);
  }

  if (!allSkills || allSkills.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium">{t("title")}</h3>
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">{t("title")}</h3>
      <div className="space-y-2">
        {allSkills.map((skill) => {
          const selected = selectedIds.includes(skill.id);
          return (
            <button
              key={skill.id}
              type="button"
              onClick={() => toggle(skill.id)}
              className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                selected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/40"
              }`}
            >
              <span className="text-lg shrink-0">{skill.icon || "⚡"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{skill.name}</p>
                {skill.description && (
                  <p className="text-xs text-muted-foreground truncate">{skill.description}</p>
                )}
              </div>
              <div className={`h-4 w-4 rounded-full border-2 transition-colors ${
                selected ? "bg-primary border-primary" : "border-muted-foreground/30"
              }`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建 agent-custom-tools-config.tsx**

与 `agent-skills-config.tsx` 结构相同，使用 `useCustomTools`、`useAgentCustomTools`、`useSetAgentCustomTools`，图标用 `Wrench`，展示 `displayName`。

- [ ] **Step 3: 在 Agent 编辑页中集成新组件**

修改 `src/app/(app)/agents/[id]/page.tsx`：

顶部新增 import：
```typescript
import { AgentSkillsConfig } from "@/components/agents/agent-skills-config";
import { AgentCustomToolsConfig } from "@/components/agents/agent-custom-tools-config";
```

在页面底部的 grid 区域（现有 `AgentKnowledgeConfig` 和 `AgentTeamConfig` 所在的 grid）中新增两个组件：

```tsx
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6 mt-8 pt-8 border-t">
        <AgentSkillsConfig agentId={agent.id} />
        <AgentCustomToolsConfig agentId={agent.id} />
        <AgentKnowledgeConfig agentId={agent.id} />
        <AgentTeamConfig agentId={agent.id} />
      </div>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/agents/agent-skills-config.tsx src/components/agents/agent-custom-tools-config.tsx src/app/\(app\)/agents/\[id\]/page.tsx
git commit -m "feat(agents): integrate Skills and Custom Tools config into Agent edit page"
```

---

## Task 19: 运行时 — 工作流引擎 + 团队委派集成

**Files:**
- Modify: `src/server/agent-team.ts`（`callTeamMember` 函数中集成 Skills + Custom Tools）
- Modify: `src/server/workflow-runs.ts`（工作流 agent 节点执行时集成）

- [ ] **Step 1: 在 callTeamMember 中注入 Skills 和 Custom Tools**

修改 `src/server/agent-team.ts`：

顶部新增 import：
```typescript
import { getAgentSkills } from "./agent-skills";
import { getAgentCustomTools } from "./agent-custom-tools";
import { buildSkillSystemPrompt } from "@/lib/skills/prompt-builder";
```

在 `callTeamMember` 函数中，构建 `baseMessages` 之前，查出 skills 并注入 system prompt：

```typescript
  const memberSkills = await getAgentSkills(agent.id);
  const skillPrompt = buildSkillSystemPrompt(memberSkills);
  const systemPrompt = agent.systemPrompt
    ? agent.systemPrompt + skillPrompt
    : skillPrompt || undefined;

  const baseMessages = [
    ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
    { role: "user" as const, content: task },
  ];
```

在构建 tools 时，查出自定义工具并传入 `resolveAgentTools`：

```typescript
  const memberCustomTools = await getAgentCustomTools(agent.id);
  const tools = resolveAgentTools(enabledTools, searchConfig, memberCustomTools, subToolDefs);
```

- [ ] **Step 2: 在工作流 agent 节点中注入 Skills 和 Custom Tools**

在 `src/server/workflow-runs.ts` 中找到调用 `generateAgentReply` 的地方（工作流 agent 节点执行），在构建 system prompt 和 tools 时同样注入 skills 和 custom tools。具体改法与 Step 1 类似——查出 agentId 关联的 skills 和 custom tools，拼接 system prompt，扩展 tools 参数。

- [ ] **Step 3: Commit**

```bash
git add src/server/agent-team.ts src/server/workflow-runs.ts
git commit -m "feat(runtime): integrate Skills and Custom Tools into team delegation and workflow engine"
```

---

## 完成检查

所有 Task 完成后，确认以下事项：

1. 执行 `pnpm run db:push` 确保新表已推送到数据库
2. 启动 `pnpm run dev`，访问侧边栏确认 Skills 和 Tools 入口可见
3. 创建一个 Skill，创建一个 Tool（HTTP 型和 Prompt 型各一个）
4. 在 Agent 编辑页中关联 Skill 和 Tool
5. 与该 Agent 对话，验证 Skill 指令已注入 system prompt、Tool 可被调用
