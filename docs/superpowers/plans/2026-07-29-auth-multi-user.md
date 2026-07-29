# 认证与多用户数据隔离 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 AgentNexus 添加用户登录、三级角色（user/admin/superAdmin）、多用户数据隔离和管理后台，现有数据迁移到默认超级管理员账号下。

**Architecture:** 自建 session 机制——`users`+`sessions` 表，bcrypt 哈希密码，HttpOnly Cookie 存 session token，服务端 `getCurrentUser()` 工具函数在页面 layout 和 API 路由里统一鉴权。给 agents/workflows/knowledge_bases/conversations/ai_provider_config 加 userId 外键做隔离，superAdmin 在 admin 后台可穿透隔离。

**Tech Stack:** Next.js 15 App Router、Drizzle ORM (MySQL)、bcryptjs、vitest（真实 MySQL 测试库，通过 `drizzle-kit push` 每次重建）

**关键测试约定（所有 API 测试必须遵守）：**
- 受保护 API 通过 `request.headers.get("cookie")` 读取 session。测试中用 `new Request(url, { headers: { cookie: "session_token=<token>" } })` 注入身份。
- 提供测试辅助 `authedRequest(userId)`，它先在库里建用户+session，返回一个带 cookie 的 Request 工厂。详见 Task 2。
- 现有路由测试直接调 handler（无 cookie）目前会通过，因为还没加鉴权；**加鉴权的任务里必须同步更新这些测试**，否则它们会因 401 失败。

---

## 文件结构

### 新增文件

| 路径 | 职责 |
|------|------|
| `src/db/schema.ts` 内新增 `users`、`sessions` 表定义 | 数据模型 |
| `src/server/users.ts` | 用户 CRUD、密码哈希/校验 |
| `src/server/sessions.ts` | session 创建/查询/续期/删除 |
| `src/lib/auth.ts` | `getCurrentUser()`、`requireUser()`、`createSessionCookie()`、常量 |
| `src/lib/password.ts` | bcrypt 封装 `hashPassword`/`verifyPassword` |
| `src/app/api/auth/login/route.ts` | 登录 |
| `src/app/api/auth/logout/route.ts` | 登出 |
| `src/app/api/auth/me/route.ts` | 取当前用户 |
| `src/app/api/admin/users/route.ts` | 用户列表/创建 |
| `src/app/api/admin/users/[id]/route.ts` | 用户编辑/删除 |
| `src/app/api/admin/stats/route.ts` | 后台概览统计 |
| `src/app/api/admin/data/agents/route.ts` | superAdmin 全量 agents |
| `src/app/api/admin/data/workflows/route.ts` | superAdmin 全量 workflows |
| `src/app/api/admin/data/knowledge-bases/route.ts` | superAdmin 全量 knowledge-bases |
| `src/app/api/admin/data/conversations/route.ts` | superAdmin 全量 conversations |
| `src/app/login/page.tsx` | 登录页 UI |
| `src/app/(admin)/layout.tsx` | 后台 layout（鉴权+独立导航） |
| `src/app/(admin)/admin/page.tsx` | 后台概览页 |
| `src/app/(admin)/admin/users/page.tsx` | 用户列表页 |
| `src/app/(admin)/admin/users/new/page.tsx` | 创建用户页 |
| `src/app/(admin)/admin/users/[id]/page.tsx` | 编辑用户页 |
| `src/app/(admin)/admin/data/page.tsx` | 全量数据浏览页 |
| `src/components/nav/user-menu.tsx` | 主站 sidebar 底部的用户下拉菜单 |
| `src/components/profile/profile-dialog.tsx` | 个人信息弹窗 |
| `scripts/migrate-add-auth.ts` | 一次性数据迁移脚本 |
| 各 server 文件 / route 文件：按任务逐个改造 | 加 userId 参数与鉴权 |

### 修改的现有文件（加 userId 字段后改查询）
`src/server/agents.ts`、`src/server/workflows.ts`、`src/server/knowledge-bases.ts`、`src/server/conversations.ts`、`src/server/provider-config.ts`、以及约 30 个 API route 文件、`src/db/test-helpers.ts`、`src/app/(app)/layout.tsx`、`src/components/nav/primary-sidebar.tsx`、i18n 文件。

---

## 阶段 1：依赖与 Schema

### Task 1: 安装 bcryptjs 依赖

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安装依赖**

Run:
```bash
pnpm add bcryptjs
pnpm add -D @types/bcryptjs
```
Expected: 安装成功，`package.json` 出现 `bcryptjs` 和 `@types/bcryptjs`。

- [ ] **Step 2: 验证可导入**

Run:
```bash
node -e "const b = require('bcryptjs'); console.log(typeof b.hashSync)"
```
Expected: 输出 `function`

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "deps: add bcryptjs for password hashing"
```

---

### Task 2: 新增 users / sessions 表与测试辅助

**Files:**
- Modify: `src/db/schema.ts`
- Modify: `src/db/test-helpers.ts`
- Create: `src/lib/password.ts`
- Create: `src/server/users.ts`
- Create: `src/server/sessions.ts`
- Create: `src/lib/auth.ts`
- Test: `src/lib/password.test.ts`
- Test: `src/server/sessions.test.ts`
- Test: `src/server/users.test.ts`

- [ ] **Step 1: 在 schema.ts 新增 users 与 sessions 表**

在 `src/db/schema.ts` 末尾追加：

```typescript
export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
  email: varchar("email", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 100 }).unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  avatar: varchar("avatar", { length: 255 }),
  role: mysqlEnum("role", ["user", "admin", "superAdmin"]).notNull().default("user"),
  createdAt: timestamp("created_at", { mode: "date", fsp: 6 })
    .notNull().defaultNow().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at", { mode: "date", fsp: 6 })
    .notNull().defaultNow().$defaultFn(() => new Date()),
});

export const sessions = mysqlTable("sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { mode: "date", fsp: 6 }).notNull(),
  createdAt: timestamp("created_at", { mode: "date", fsp: 6 })
    .notNull().defaultNow().$defaultFn(() => new Date()),
});
```

- [ ] **Step 2: 创建 password 工具**

`src/lib/password.ts`:

```typescript
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

- [ ] **Step 3: 写 password 测试**

`src/lib/password.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("secret123");
    expect(hash).not.toBe("secret123");
    expect(await verifyPassword("secret123", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});
```

- [ ] **Step 4: 跑测试验证通过**

Run: `pnpm test src/lib/password.test.ts`
Expected: PASS

- [ ] **Step 5: 创建 users server 模块**

`src/server/users.ts`:

```typescript
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createId } from "@/lib/id";
import { hashPassword } from "@/lib/password";

export type SafeUser = {
  id: string;
  email: string;
  username: string | null;
  name: string;
  avatar: string | null;
  role: "user" | "admin" | "superAdmin";
};

export function toSafeUser(row: typeof users.$inferSelect): SafeUser {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    name: row.name,
    avatar: row.avatar,
    role: row.role,
  };
}

export async function getUserById(id: string) {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row ?? null;
}

export async function getUserByEmail(email: string) {
  const [row] = await db.select().from(users).where(eq(users.email, email));
  return row ?? null;
}

export async function listUsers() {
  return db.select().from(users);
}

export async function createUser(input: {
  email: string;
  password: string;
  name: string;
  username?: string;
  avatar?: string | null;
  role: "user" | "admin" | "superAdmin";
}) {
  const id = createId();
  const passwordHash = await hashPassword(input.password);
  await db.insert(users).values({
    id,
    email: input.email,
    username: input.username ?? null,
    passwordHash,
    name: input.name,
    avatar: input.avatar ?? null,
    role: input.role,
  });
  return getUserById(id);
}
```

- [ ] **Step 6: 创建 sessions server 模块**

`src/server/sessions.ts`:

```typescript
import { eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { toSafeUser, type SafeUser } from "./users";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 天
const RENEW_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 不足 7 天续期

export async function createSession(userId: string) {
  const id = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id, userId, expiresAt });
  return { id, expiresAt };
}

export async function getSessionUser(sessionId: string): Promise<{ user: SafeUser; renewed?: Date } | null> {
  const [row] = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId));

  if (!row) return null;
  if (row.expiresAt.getTime() <= Date.now()) return null;

  let renewed: Date | undefined;
  if (row.expiresAt.getTime() - Date.now() < RENEW_THRESHOLD_MS) {
    renewed = new Date(Date.now() + SESSION_TTL_MS);
    await db.update(sessions).set({ expiresAt: renewed }).where(eq(sessions.id, sessionId));
  }

  return { user: toSafeUser(row.user), renewed };
}

export async function deleteSession(sessionId: string) {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function deleteExpiredSessions() {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

function randomToken(): string {
  const { randomBytes } = require("crypto") as typeof import("crypto");
  return randomBytes(32).toString("hex");
}
```

- [ ] **Step 7: 创建 auth 工具**

`src/lib/auth.ts`:

```typescript
import { cookies } from "next/headers";
import { createSession, getSessionUser, deleteSession } from "@/server/sessions";
import { getUserByEmail } from "@/server/users";
import { verifyPassword } from "@/lib/password";
import { apiError } from "@/lib/api-response";
import { toSafeUser, type SafeUser } from "@/server/users";

export const SESSION_COOKIE = "session_token";

export async function getCurrentUser(): Promise<SafeUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const result = await getSessionUser(token);
  return result?.user ?? null;
}

export async function requireUser(): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: { code: "unauthorized", message: "Authentication required" } }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return user;
}

export async function setSessionCookie(userId: string) {
  const { id, expiresAt } = await createSession(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  store.delete(SESSION_COOKIE);
}

export async function authenticateWithCredentials(email: string, password: string): Promise<SafeUser | null> {
  const row = await getUserByEmail(email.toLowerCase().trim());
  if (!row) return null;
  const ok = await verifyPassword(password, row.passwordHash);
  if (!ok) return null;
  return toSafeUser(row);
}
```

- [ ] **Step 8: 更新 test-helpers 清理新表**

在 `src/db/test-helpers.ts` 顶部 import 加 `users`、`sessions`，并在 `clearAllTables` 开头删这两张表（因外键依赖，sessions 先于 users）：

```typescript
import {
  agents,
  conversations,
  messages,
  aiProviderConfig,
  workflowStepLogs,
  workflowRuns,
  workflows,
  users,
  sessions,
} from "./schema";

export async function clearAllTables() {
  await db.delete(sessions);
  await db.delete(messages);
  await db.delete(conversations);
  await db.delete(workflowStepLogs);
  await db.delete(workflowRuns);
  await db.delete(workflows);
  await db.delete(agents);
  await db.delete(aiProviderConfig);
  await db.delete(users);
}
```

- [ ] **Step 9: 同步 schema 到 test 库**

Run: `pnpm exec drizzle-kit push --force`
（vitest.setup.ts 每次跑会自动 push，但手动跑一次确认 schema 语法无误）
Expected: 输出新建 `users`、`sessions` 表，无报错。

- [ ] **Step 10: 写 sessions 测试**

`src/server/sessions.test.ts`:

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables } from "@/db/test-helpers";
import { createUser } from "./users";
import { createSession, getSessionUser, deleteSession } from "./sessions";

afterEach(clearAllTables);

describe("sessions", () => {
  it("creates a session and resolves the user", async () => {
    const user = await createUser({ email: "a@b.com", password: "pw12345", name: "A", role: "user" });
    const session = await createSession(user!.id);
    expect(session.id).toHaveLength(64);
    const result = await getSessionUser(session.id);
    expect(result?.user.id).toBe(user!.id);
    expect(result?.user.email).toBe("a@b.com");
  });

  it("returns null for unknown session", async () => {
    expect(await getSessionUser("nonexistent")).toBeNull();
  });

  it("deletes a session", async () => {
    const user = await createUser({ email: "a@b.com", password: "pw12345", name: "A", role: "user" });
    const session = await createSession(user!.id);
    await deleteSession(session.id);
    expect(await getSessionUser(session.id)).toBeNull();
  });
});
```

- [ ] **Step 11: 写 users 测试**

`src/server/users.test.ts`:

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables } from "@/db/test-helpers";
import { createUser, getUserByEmail, toSafeUser } from "./users";

afterEach(clearAllTables);

describe("users", () => {
  it("creates a user with hashed password and strips it in safe view", async () => {
    const row = await createUser({ email: "A@B.com", password: "pw12345", name: "A", role: "admin" });
    expect(row?.passwordHash).toBeTruthy();
    expect(row?.passwordHash).not.toBe("pw12345");
    const safe = toSafeUser(row!);
    expect(safe.email).toBe("A@B.com");
    expect(safe.role).toBe("admin");
    expect((safe as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it("finds user by email case-sensitively as stored", async () => {
    await createUser({ email: "a@b.com", password: "pw12345", name: "A", role: "user" });
    expect(await getUserByEmail("a@b.com")).toBeTruthy();
    expect(await getUserByEmail("x@y.com")).toBeNull();
  });
});
```

- [ ] **Step 12: 跑测试验证通过**

Run: `pnpm test src/server/sessions.test.ts src/server/users.test.ts src/lib/password.test.ts`
Expected: 全部 PASS

- [ ] **Step 13: Commit**

```bash
git add src/db/schema.ts src/db/test-helpers.ts src/lib/password.ts src/lib/password.test.ts src/server/users.ts src/server/sessions.ts src/server/users.test.ts src/server/sessions.test.ts src/lib/auth.ts
git commit -m "feat(auth): add users/sessions tables, password hashing, session and auth helpers"
```

---

## 阶段 2：给现有表加 userId 列 + 数据迁移

### Task 3: 给 5 张表加 userId（nullable）

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1: 在 schema.ts 的 5 张表加 userId 字段**

在 `agents` 表定义里，紧跟 `id` 行之后加：

```typescript
  userId: varchar("user_id", { length: 36 }),
```

对 `workflows`、`knowledgeBases`、`conversations`、`aiProviderConfig` 四张表做同样操作——在各自 `id` 之后加 `userId` 列（nullable，不加 .references 约束以避免迁移期外键阻塞；迁移完成后视情况补约束）。

- [ ] **Step 2: 同步 schema**

Run: `pnpm exec drizzle-kit push --force`
Expected: 给 5 张表新增 `user_id` 列（nullable），现有数据该列为 NULL。

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat(auth): add nullable userId column to agents/workflows/knowledge_bases/conversations/ai_provider_config"
```

---

### Task 4: 数据迁移脚本

**Files:**
- Create: `scripts/migrate-add-auth.ts`

- [ ] **Step 1: 写迁移脚本**

`scripts/migrate-add-auth.ts`:

```typescript
import "dotenv/config";
import { db } from "@/db";
import { users, agents, workflows, knowledgeBases, conversations, aiProviderConfig } from "@/db/schema";
import { createUser } from "@/server/users";

async function main() {
  const email = process.env.MIGRATE_ADMIN_EMAIL;
  const password = process.env.MIGRATE_ADMIN_PASSWORD;
  if (!email || !password) {
    console.error("Set MIGRATE_ADMIN_EMAIL and MIGRATE_ADMIN_PASSWORD env vars");
    process.exit(1);
  }

  const existing = await db.select().from(users).limit(1);
  if (existing.length > 0) {
    console.error("Migration already run: users table is not empty. Aborting.");
    process.exit(1);
  }

  const admin = await createUser({
    email,
    password,
    name: "Super Admin",
    role: "superAdmin",
  });
  console.log("Created superAdmin account:", admin!.id, admin!.email);

  await db.update(agents).set({ userId: admin!.id });
  await db.update(workflows).set({ userId: admin!.id });
  await db.update(knowledgeBases).set({ userId: admin!.id });
  await db.update(conversations).set({ userId: admin!.id });
  await db.update(aiProviderConfig).set({ userId: admin!.id });

  console.log("Backfilled userId on existing rows.");
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Commit**

```bash
git add scripts/migrate-add-auth.ts
git commit -m "feat(auth): add migration script to backfill userId onto existing data"
```

> **执行说明（不在 plan 执行期内运行）：** 待 userId 改为 NOT NULL 之前（Task 5），用户需在本地设置 `MIGRATE_ADMIN_EMAIL` 和 `MIGRATE_ADMIN_PASSWORD` 后运行 `pnpm exec tsx scripts/migrate-add-auth.ts`。该账号信息会打印到控制台。

---

### Task 5: userId 改为 NOT NULL（迁移完成后）

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1: 把 5 张表的 userId 列改为 notNull**

在 schema.ts 里把 5 处 `userId: varchar("user_id", { length: 36 }),` 改为：

```typescript
  userId: varchar("user_id", { length: 36 }).notNull(),
```

- [ ] **Step 2: 同步 schema**

Run: `pnpm exec drizzle-kit push --force`
Expected: 列改为 NOT NULL（前提是数据迁移已把所有 NULL 填满，否则会报错——这正是我们想要的保护）

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat(auth): make userId NOT NULL after data backfill"
```

---

## 阶段 3：改造 server 层加 userId 过滤

> 改造原则：每个查询/创建函数加 `userId` 参数，查询里 `.where(eq(table.userId, userId))`；创建时写入 `userId`。getById 类函数除了按 id 查，也要校验返回数据的 userId 与调用者一致（隔离）。superAdmin 全量查询走单独的 admin server 函数（阶段 6）。

### Task 6: 改造 agents server + API

**Files:**
- Modify: `src/server/agents.ts`
- Modify: `src/app/api/agents/route.ts`
- Modify: `src/app/api/agents/[id]/route.ts`
- Test: `src/app/api/agents/route.test.ts`

- [ ] **Step 1: 改造 agents.ts**

修改 `src/server/agents.ts`：
- `createAgent(input, userId)` —— insert 时带 userId
- `listAgentsWithStats(userId)` —— 加 `.where(eq(agents.userId, userId))`
- `listAgents(userId)` —— 同上
- `getAgent(id)` —— 不变签名，但调用方需自行校验归属（见 Step 3 helper）

在文件顶部 import 加 `agents` 已有，需新增 `getAgentOwnedBy(id, userId)` 辅助：

```typescript
export async function getAgentOwnedBy(id: string, userId: string) {
  const [row] = await db.select().from(agents).where(and(eq(agents.id, id), eq(agents.userId, userId)));
  return row ?? null;
}

export async function updateAgent(id: string, input: AgentUpdateInput, userId: string) {
  const existing = await getAgentOwnedBy(id, userId);
  if (!existing) return null;
  await db.update(agents).set({ ...input, updatedAt: new Date() }).where(eq(agents.id, id));
  return getAgent(id);
}

export async function deleteAgent(id: string, userId: string) {
  const existing = await getAgentOwnedBy(id, userId);
  if (!existing) return false;
  await db.delete(agents).where(eq(agents.id, id));
  return true;
}
```

`createAgent` 改为：

```typescript
export async function createAgent(input: AgentInput, userId: string) {
  const id = createId();
  await db.insert(agents).values({ ...input, id, userId });
  return getAgent(id);
}
```

`listAgentsWithStats` 的 `.from(agents)` 链加 `.where(eq(agents.userId, userId))`。

- [ ] **Step 2: 改造 GET/POST /api/agents**

`src/app/api/agents/route.ts`:

```typescript
import { agentInputSchema } from "@/lib/validation/agent";
import { createAgent, listAgentsWithStats } from "@/server/agents";
import { apiOk, apiError } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();
  const all = await listAgentsWithStats(user.id);
  return apiOk(all);
}

export async function POST(request: Request) {
  const user = await requireUser();
  const body = await request.json();
  const parsed = agentInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "validation_error", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const created = await createAgent(parsed.data, user.id);
  return apiOk(created, 201);
}
```

- [ ] **Step 3: 改造 GET/PATCH/DELETE /api/agents/[id]**

`src/app/api/agents/[id]/route.ts` 用 `getAgentOwnedBy` 做归属校验，404 当不存在或非本人。示例 GET：

```typescript
import { getAgentOwnedBy, updateAgent, deleteAgent } from "@/server/agents";
import { apiOk, apiError } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await requireUser();
  const { id } = await params;
  const agent = await getAgentOwnedBy(id, user.id);
  if (!agent) return apiError(404, "not_found", "Agent not found");
  return apiOk(agent);
}
```
PATCH/DELETE 同理用 `updateAgent(id, input, user.id)` / `deleteAgent(id, user.id)`，返回 null/false 时 404。

- [ ] **Step 4: 更新 route 测试注入身份**

改造 `src/app/api/agents/route.test.ts`：删去直接调用，改为通过 cookie 注入身份。新增测试辅助（放 `src/db/test-helpers.ts` 同目录或直接在测试里）：

```typescript
import { createUser } from "@/server/users";
import { createSession } from "@/server/sessions";

async function authedUser(role: "user" | "admin" | "superAdmin" = "user") {
  const u = await createUser({ email: `u${Math.random()}@test.com`, password: "pw12345", name: "U", role });
  const s = await createSession(u!.id);
  return { user: u!, cookie: `session_token=${s.id}` };
}
```

测试改为：

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables, authedUser } from "@/db/test-helpers";
import { GET, POST } from "./route";

afterEach(clearAllTables);

function jsonRequest(cookie: string, body: unknown) {
  return new Request("http://localhost/api/agents", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify(body),
  });
}

describe("POST /api/agents", () => {
  it("creates an agent for the authed user", async () => {
    const { cookie } = await authedUser();
    const res = await POST(jsonRequest(cookie, { name: "Helper", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null, memoryWindowSize: 20, toolsConfig: { enabledTools: [] } }));
    expect(res.status).toBe(201);
  });

  it("returns 401 without auth", async () => {
    const res = await POST(jsonRequest("", { name: "Helper" }));
    expect(res.status).toBe(401);
  });
});

describe("GET /api/agents", () => {
  it("returns only the authed user's agents", async () => {
    const { cookie: alice } = await authedUser();
    const { cookie: bob } = await authedUser();
    await POST(jsonRequest(alice, { name: "Alice's", description: "", avatar: "", tags: [], systemPrompt: "", temperature: 0.7, maxTokens: 1024, topP: 1, model: null, memoryWindowSize: 20, toolsConfig: { enabledTools: [] } }));
    const res = await GET(new Request("http://localhost/api/agents", { headers: { cookie: bob } }));
    expect(await res.json()).toEqual([]);
  });
});
```

把 `authedUser` 放进 `src/db/test-helpers.ts` 导出。

- [ ] **Step 5: 跑测试验证通过**

Run: `pnpm test src/app/api/agents/route.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/server/agents.ts src/app/api/agents/route.ts "src/app/api/agents/[id]/route.ts" src/app/api/agents/route.test.ts src/db/test-helpers.ts
git commit -m "feat(auth): scope agents by userId with auth"
```

---

### Task 7: 改造 conversations / messages server + API

**Files:**
- Modify: `src/server/conversations.ts`
- Modify: `src/app/api/conversations/[id]/route.ts`
- Modify: `src/app/api/agents/[id]/conversations/route.ts`
- Modify: `src/app/api/conversations/[id]/messages/route.ts`
- Modify: `src/app/api/conversations/[id]/messages/assistant/route.ts`
- Modify: `src/app/api/messages/[id]/route.ts`
- Modify: `src/app/api/conversations/[id]/shares/route.ts` (若存在)
- Test: `src/app/api/conversations/[id]/route.test.ts`
- Test: `src/app/api/agents/[id]/conversations/route.test.ts`

- [ ] **Step 1: 改造 conversations.ts**

```typescript
export async function createConversation(agentId: string, userId: string, title = "New conversation") {
  const id = createId();
  await db.insert(conversations).values({ id, agentId, userId, title });
  return getConversationById(id);
}

export async function listConversationsForAgent(agentId: string, userId: string) {
  return db.select().from(conversations)
    .where(and(eq(conversations.agentId, agentId), eq(conversations.userId, userId)))
    .orderBy(desc(conversations.createdAt));
}

export async function getConversationOwnedBy(id: string, userId: string) {
  const [row] = await db.select().from(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
  return row ?? null;
}

export async function updateConversationTitle(id: string, userId: string, title: string) {
  const existing = await getConversationOwnedBy(id, userId);
  if (!existing) return null;
  await db.update(conversations).set({ title, updatedAt: new Date() }).where(eq(conversations.id, id));
  return getConversationById(id);
}

export async function deleteConversation(id: string, userId: string) {
  const existing = await getConversationOwnedBy(id, userId);
  if (!existing) return false;
  await db.delete(conversations).where(eq(conversations.id, id));
  return true;
}
```

- [ ] **Step 2: 改造各 conversations API route**

`/api/agents/[id]/conversations` GET：`requireUser()` → `getAgentOwnedBy(agentId, user.id)` 校验 agent 归属（404 否则）→ `listConversationsForAgent(agentId, user.id)`。

`/api/conversations/[id]` GET/PATCH/DELETE：`requireUser()` → `getConversationOwnedBy`/`updateConversationTitle`/`deleteConversation` 传 `user.id`，找不到 404。

`/api/conversations/[id]/messages` POST：`requireUser()` → 先 `getConversationOwnedBy(id, user.id)` 校验，再走原有发消息逻辑。**重要**：原有代码用 `getAgent(conversation.agentId)` 取 agent，加 auth 后 agent 也可能不归属该用户——但因 conversation 已校验归属且其 agentId 来自该 conversation，agent 必然同属一人，安全。

`/api/conversations/[id]/messages/assistant` POST、`/api/messages/[id]` DELETE、`/api/conversations/[id]/shares` POST/DELETE：同理在开头加 `requireUser()` 并用 `getConversationOwnedBy` 或 message→conversation→owner 链校验归属。`messages` 删除时需先查出 message 的 conversationId，再 `getConversationOwnedBy(conversationId, user.id)` 校验。

- [ ] **Step 3: 更新 conversations 测试**

`src/app/api/conversations/[id]/route.test.ts` 与 `src/app/api/agents/[id]/conversations/route.test.ts`：用 `authedUser()` 注入身份，`createAgent(input, user.id)` 与 `createConversation(agent.id, user.id)` 都传 userId。补一条"401 无 auth"用例。

- [ ] **Step 4: 跑测试**

Run: `pnpm test src/app/api/conversations/ src/app/api/agents/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/conversations.ts src/app/api/conversations src/app/api/agents src/app/api/messages
git commit -m "feat(auth): scope conversations/messages by userId with auth"
```

---

### Task 8: 改造 workflows server + API

**Files:**
- Modify: `src/server/workflows.ts`
- Modify: `src/app/api/workflows/route.ts`
- Modify: `src/app/api/workflows/[id]/route.ts`
- Modify: `src/app/api/workflows/[id]/runs/route.ts`
- Modify: `src/app/api/workflows/[id]/versions/route.ts`
- Modify: `src/app/api/workflows/[id]/versions/[n]/restore/route.ts`
- Modify: `src/app/api/workflow-runs/[id]/route.ts`
- Modify: `src/app/api/workflow-runs/[id]/resume/route.ts`
- Modify: `src/app/api/workflow-runs/[id]/retry/route.ts`
- Test: `src/app/api/workflows/route.test.ts`

- [ ] **Step 1: 改造 workflows.ts**

`createWorkflow(input, userId)`、`listWorkflows(userId)`、`getWorkflowOwnedBy(id, userId)`、`updateWorkflow(id, input, userId)`、`deleteWorkflow(id, userId)`，全部加 `.where(eq(workflows.userId, userId))` 或归属校验。run/version 相关查询走 workflow 归属校验后不变。

- [ ] **Step 2: 改造各 workflow API route**

所有路由开头 `requireUser()`。`/api/workflows` GET/POST 传 userId；`[id]` 系列 GET/PATCH/DELETE 用 `getWorkflowOwnedBy`；runs/versions/retry/resume 先校验 workflow 归属再走原逻辑（workflowRuns.workflowId → workflow → owner）。

- [ ] **Step 3: 更新 workflows 测试**

`src/app/api/workflows/route.test.ts`：注入身份，`createWorkflow(input, user.id)`，补 401 与隔离用例。

- [ ] **Step 4: 跑测试**

Run: `pnpm test src/app/api/workflows src/app/api/workflow-runs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/workflows.ts src/app/api/workflows src/app/api/workflow-runs
git commit -m "feat(auth): scope workflows and runs by userId with auth"
```

---

### Task 9: 改造 knowledge-bases server + API

**Files:**
- Modify: `src/server/knowledge-bases.ts`
- Modify: `src/app/api/knowledge-bases/route.ts`
- Modify: `src/app/api/knowledge-bases/[id]/route.ts`
- Modify: `src/app/api/knowledge-bases/[id]/documents/route.ts` (GET/POST)
- Modify: `src/app/api/knowledge-bases/[id]/documents/[docId]/route.ts` (DELETE)
- Modify: `src/app/api/knowledge-bases/[id]/documents/[docId]/reindex/route.ts`
- Modify: `src/app/api/knowledge-bases/[id]/documents/[docId]/content/route.ts`
- Modify: `src/app/api/knowledge-bases/[id]/test-retrieval/route.ts`
- Modify: `src/app/api/knowledge-bases/[id]/route.test.ts`（若存在）
- Modify: `src/server/agent-knowledge.ts`（setAgentKnowledgeBases 需校验 kb 归属）
- Modify: `src/app/api/agents/[id]/knowledge-bases/route.ts`

- [ ] **Step 1: 改造 knowledge-bases.ts**

`createKnowledgeBase(input, userId)`、`listKnowledgeBases(userId)`、`getKnowledgeBaseOwnedBy(id, userId)`、`updateKnowledgeBase(id, input, userId)`、`deleteKnowledgeBase(id, userId)`。

- [ ] **Step 2: 改造各 KB API route**

全部开头 `requireUser()`，CRUD 传 userId，详情类用 `getKnowledgeBaseOwnedBy` 校验归属。documents/reindex/content/test-retrieval 都先 `getKnowledgeBaseOwnedBy(kbId, user.id)` 校验，404 否则。

`/api/agents/[id]/knowledge-bases` GET/PUT：先校验 agent 归属，再操作；PUT 时校验所有传入的 kbId 都归属该 user（用 `getKnowledgeBaseOwnedBy`）。

- [ ] **Step 3: 更新 KB 测试**

注入身份，补 401 与隔离用例。

- [ ] **Step 4: 跑测试**

Run: `pnpm test src/app/api/knowledge-bases`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/knowledge-bases.ts src/server/agent-knowledge.ts src/app/api/knowledge-bases src/app/api/agents
git commit -m "feat(auth): scope knowledge bases by userId with auth"
```

---

### Task 10: 改造 provider-config (Settings) server + API

**Files:**
- Modify: `src/server/provider-config.ts`
- Modify: `src/app/api/settings/ai-provider/route.ts`
- Modify: `src/app/api/settings/ai-provider/test/route.ts`
- Test: 相关 route.test.ts

- [ ] **Step 1: 改造 provider-config.ts**

```typescript
export async function getProviderConfig(userId: string) {
  const [row] = await db.select().from(aiProviderConfig).where(eq(aiProviderConfig.userId, userId));
  return row ?? null;
}

export async function upsertProviderConfig(input: ProviderConfigInput, userId: string) {
  await db.delete(aiProviderConfig).where(eq(aiProviderConfig.userId, userId));
  const id = createId();
  await db.insert(aiProviderConfig).values({ ...input, id, userId });
  return getProviderConfig(userId);
}
```

- [ ] **Step 2: 改造 settings API route**

GET/PUT 开头 `requireUser()`，调用传 `user.id`。test route（连通性测试）同理。

- [ ] **Step 3: 更新 settings 测试**

注入身份，补隔离用例（用户 A 的配置用户 B 看不到）。

- [ ] **Step 4: 跑测试**

Run: `pnpm test src/app/api/settings`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/provider-config.ts src/app/api/settings
git commit -m "feat(auth): scope ai-provider config by userId with auth"
```

---

### Task 11: 改造 dashboard / files API

**Files:**
- Modify: `src/server/dashboard.ts`
- Modify: `src/app/api/dashboard/stats/route.ts`
- Modify: `src/app/api/files/upload/route.ts`
- Test: `src/app/api/dashboard/stats/route.test.ts`（若存在）

- [ ] **Step 1: 改造 dashboard.ts**

所有查询函数加 `userId` 参数，`.where(...)` 链上叠加 `and(gte(messages.createdAt, since), eq(conversations.userId, userId))`（conversations 已有 userId 列）。`getOverviewStatsInWindow(since, until, userId)`、`getTokenTrend(range, userId)` 等签名都加 userId。

- [ ] **Step 2: 改造 dashboard API route**

`requireUser()` → 所有函数传 `user.id`。

- [ ] **Step 3: 改造 files/upload**

`POST /api/files/upload`：`requireUser()`。附件创建时无需 userId（附件通过 message 间接归属），但上传动作要求登录。返回的 attachment 后续 link 到 message 时已受 conversation 归属保护。

`GET /api/files/[id]`：**不加鉴权**（分享页引用附件）。

- [ ] **Step 4: 更新 dashboard 测试**

注入身份，补隔离用例。

- [ ] **Step 5: 跑测试**

Run: `pnpm test src/app/api/dashboard src/app/api/files`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/server/dashboard.ts src/app/api/dashboard src/app/api/files
git commit -m "feat(auth): scope dashboard stats by userId; require auth for file upload"
```

---

### Task 12: 处理 use-chat-stream 与前端 hooks 的 userId

**Files:**
- Modify: `src/hooks/use-chat-stream.ts`（无需改，后端已校验）
- Verify: 前端调用不传 userId（由 cookie 自动携带）

- [ ] **Step 1: 验证前端无需改动**

确认 `useChatStream` 里所有 `fetch` 都是同源请求，浏览器自动带 cookie，无需手动加 userId。无需改代码。

- [ ] **Step 2: Commit（仅文档/无代码则跳过）**

无代码改动，跳过 commit。

---

## 阶段 4：登录/登出/me API + 登录页

### Task 13: auth API 路由

**Files:**
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/app/api/auth/me/route.ts`
- Test: `src/app/api/auth/login/route.test.ts`
- Test: `src/app/api/auth/me/route.test.ts`

- [ ] **Step 1: 写 login route**

`src/app/api/auth/login/route.ts`:

```typescript
import { apiOk, apiError } from "@/lib/api-response";
import { authenticateWithCredentials, setSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) return apiError(400, "validation_error", "email and password are required");

  const user = await authenticateWithCredentials(email, password);
  if (!user) return apiError(401, "invalid_credentials", "Email or password is incorrect");

  await setSessionCookie(user.id);
  return apiOk(user);
}
```

- [ ] **Step 2: 写 logout route**

`src/app/api/auth/logout/route.ts`:

```typescript
import { apiOk } from "@/lib/api-response";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  await clearSessionCookie();
  return apiOk({ ok: true });
}
```

- [ ] **Step 3: 写 me route**

`src/app/api/auth/me/route.ts`:

```typescript
import { apiOk } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiOk(null);
  return apiOk(user);
}
```

- [ ] **Step 4: 写 login 测试**

`src/app/api/auth/login/route.test.ts`:

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables } from "@/db/test-helpers";
import { createUser } from "@/server/users";
import { POST } from "./route";

afterEach(clearAllTables);

function loginReq(email: string, password: string) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

describe("POST /api/auth/login", () => {
  it("logs in with correct credentials and sets cookie", async () => {
    await createUser({ email: "a@b.com", password: "pw12345", name: "A", role: "user" });
    const res = await POST(loginReq("a@b.com", "pw12345"));
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("session_token=");
    expect(setCookie).toContain("HttpOnly");
  });

  it("rejects wrong password with 401", async () => {
    await createUser({ email: "a@b.com", password: "pw12345", name: "A", role: "user" });
    const res = await POST(loginReq("a@b.com", "wrong"));
    expect(res.status).toBe(401);
  });

  it("rejects unknown email with 401", async () => {
    const res = await POST(loginReq("nobody@b.com", "pw12345"));
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 5: 写 me 测试**

`src/app/api/auth/me/route.test.ts`:

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables, authedUser } from "@/db/test-helpers";
import { GET } from "./route";

afterEach(clearAllTables);

describe("GET /api/auth/me", () => {
  it("returns null without a session", async () => {
    const res = await GET(new Request("http://localhost/api/auth/me"));
    expect(res.status).toBe(200);
    expect(await res.json()).toBeNull();
  });

  it("returns the authed user with a session", async () => {
    const { user, cookie } = await authedUser();
    const res = await GET(new Request("http://localhost/api/auth/me", { headers: { cookie } }));
    const body = await res.json();
    expect(body.id).toBe(user.id);
    expect(body.email).toBe(user.email);
  });
});
```

- [ ] **Step 6: 跑测试**

Run: `pnpm test src/app/api/auth`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/app/api/auth
git commit -m "feat(auth): add login/logout/me API routes"
```

---

### Task 14: 登录页 UI

**Files:**
- Create: `src/app/login/page.tsx`
- Modify: i18n `messages/zh-CN.json` + `messages/en.json`

- [ ] **Step 1: 加 i18n 键**

zh-CN.json 顶层加：
```json
"auth": {
  "login": "登录",
  "logout": "退出登录",
  "email": "邮箱",
  "password": "密码",
  "loginButton": "登录",
  "loginError": "邮箱或密码错误",
  "welcome": "欢迎回来",
  "loginSubtitle": "登录以开始使用 AgentNexus"
}
```
en.json 同结构英文。

- [ ] **Step 2: 写登录页**

`src/app/login/page.tsx`（client component）：邮箱+密码表单，POST `/api/auth/login`，成功 `router.push("/chat")`，失败 toast。已登录则重定向（用 server wrapper 或在 page 内 useEffect 调 `/api/auth/me` 判断）。

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (res.ok) router.push("/chat");
    else toast.error(t("loginError"));
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="h-12 w-12 rounded-xl brand-gradient flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold">{t("welcome")}</h1>
          <p className="text-sm text-muted-foreground">{t("loginSubtitle")}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{t("loginButton")}</Button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/login messages/zh-CN.json messages/en.json
git commit -m "feat(auth): add login page UI"
```

---

### Task 15: 主站 layout 鉴权 + 用户菜单

**Files:**
- Modify: `src/app/(app)/layout.tsx`
- Create: `src/components/nav/user-menu.tsx`
- Modify: `src/components/nav/primary-sidebar.tsx`
- Create: `src/components/profile/profile-dialog.tsx`
- Create: `src/app/api/profile/route.ts`（改密码/改资料）

- [ ] **Step 1: 改 (app)/layout.tsx 加鉴权**

```tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PrimarySidebar } from "@/components/nav/primary-sidebar";
import { OnboardingDialog } from "@/components/nav/onboarding-dialog";
import { ShortcutsDialog } from "@/components/nav/shortcuts-dialog";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      <PrimarySidebar user={user} />
      <div className="flex-1 flex flex-col overflow-y-auto min-w-0">{children}</div>
      <OnboardingDialog />
      <ShortcutsDialog />
    </div>
  );
}
```

- [ ] **Step 2: 创建 user-menu 组件**

`src/components/nav/user-menu.tsx`：DropdownMenu，trigger 为 avatar+name，items：个人信息（打开 ProfileDialog）、管理后台（仅 admin/superAdmin，Link /admin）、退出登录（POST /api/auth/logout 后 router.push("/login")）。

- [ ] **Step 3: 改 primary-sidebar 接收 user prop**

`PrimarySidebar({ user })`：底部原 LocaleSwitcher+ThemeToggle 区域上方加 `<UserMenu user={user} />`。

- [ ] **Step 4: 创建 profile API + dialog**

`src/app/api/profile/route.ts`：PATCH，`requireUser()`，可改 name/avatar/密码（改密码需验证旧密码）。更新 users 表。

`src/components/profile/profile-dialog.tsx`：表单改 name/avatar/旧密码+新密码。

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/layout.tsx" src/components/nav/user-menu.tsx src/components/nav/primary-sidebar.tsx src/components/profile src/app/api/profile
git commit -m "feat(auth): protect app layout, add user menu and profile editing"
```

---

## 阶段 5：/admin 后台

### Task 16: admin API 路由

**Files:**
- Create: `src/server/admin.ts`
- Create: `src/app/api/admin/users/route.ts`
- Create: `src/app/api/admin/users/[id]/route.ts`
- Create: `src/app/api/admin/stats/route.ts`
- Create: `src/app/api/admin/data/agents/route.ts`
- Create: `src/app/api/admin/data/workflows/route.ts`
- Create: `src/app/api/admin/data/knowledge-bases/route.ts`
- Create: `src/app/api/admin/data/conversations/route.ts`
- Test: `src/app/api/admin/users/route.test.ts`

- [ ] **Step 1: 创建 admin server 模块**

`src/server/admin.ts`：`listUsersWithStats()`、`createUserByAdmin(...)`、`updateUser(...)`、`deleteUser(id, actorId)`（禁止删自己）、`getAdminOverview()`、`listAllAgents()`、`listAllWorkflows()`、`listAllKnowledgeBases()`、`listAllConversations()`（后者 join users 取 ownerName）。

- [ ] **Step 2: 写 requireAdmin / requireSuperAdmin helper**

在 `src/lib/auth.ts` 加：

```typescript
export async function requireAdmin(): Promise<SafeUser> {
  const user = await requireUser();
  if (user.role === "user") throw unauthorized();
  return user;
}

export async function requireSuperAdmin(): Promise<SafeUser> {
  const user = await requireUser();
  if (user.role !== "superAdmin") throw forbidden();
  return user;
}
```
（unauthorized/forbidden 是构造 401/403 Response 的小工具，已在 requireUser 模式里体现。）

- [ ] **Step 3: 写 admin/users route**

`/api/admin/users` GET=`requireAdmin()`→`listUsersWithStats()`；POST=`requireAdmin()`，校验：actor.role==="admin" 时只能建 role==="user"，创建用 `createUserByAdmin`。

`/api/admin/users/[id]` GET/PATCH/DELETE：`requireAdmin()`，PATCH 时校验角色权限（admin 不能改同级或更高），DELETE 禁止删 actor 自己（`if (targetId === user.id) return 403`）。

- [ ] **Step 4: 写 admin/stats route**

`requireAdmin()` → `getAdminOverview()`。

- [ ] **Step 5: 写 admin/data/* route（superAdmin only）**

每个 `requireSuperAdmin()` → 对应 `listAll*()`，返回数据带 ownerName。

- [ ] **Step 6: 写 admin/users 测试**

`src/app/api/admin/users/route.test.ts`：用 `authedUser("admin")` 与 `authedUser("superAdmin")` 与 `authedUser("user")`，验证 user 访问 403、admin 可列、admin 不能建 admin、superAdmin 可建 admin、不能删自己。

- [ ] **Step 7: 跑测试**

Run: `pnpm test src/app/api/admin`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/server/admin.ts src/lib/auth.ts src/app/api/admin
git commit -m "feat(auth): add admin API routes (users CRUD, stats, superAdmin data browsing)"
```

---

### Task 17: /admin 后台页面

**Files:**
- Create: `src/app/(admin)/layout.tsx`
- Create: `src/app/(admin)/admin/page.tsx`
- Create: `src/app/(admin)/admin/users/page.tsx`
- Create: `src/app/(admin)/admin/users/new/page.tsx`
- Create: `src/app/(admin)/admin/users/[id]/page.tsx`
- Create: `src/app/(admin)/admin/data/page.tsx`
- Modify: i18n（加 admin 命名空间）
- Modify: `src/components/nav/primary-sidebar.tsx`（admin/superAdmin 显示 /admin 入口——已在 Task 15 UserMenu）

- [ ] **Step 1: 加 i18n admin 命名空间**

zh-CN/en.json 加 `admin.overview`/`admin.users`/`admin.createUser`/`admin.editUser`/`admin.data`/`admin.confirmDelete`/`admin.role`/`admin.email`/`admin.name`/`admin.initialPassword`/`admin.resetPassword`/`admin.created`/`admin.roleUser`/`admin.roleAdmin`/`admin.roleSuperAdmin`。

- [ ] **Step 2: 写 (admin)/layout.tsx**

server component，`getCurrentUser()`，未登录 redirect /login，role==="user" redirect /chat。渲染独立极简 sidebar（概览/用户管理/数据浏览[supreAdmin only]）+ children。

- [ ] **Step 3: 写概览页 /admin**

调 `/api/admin/stats`，展示用户数、agent 数、对话数卡片。

- [ ] **Step 4: 写用户列表页 /admin/users**

调 `/api/admin/users`，表格展示，"新建"按钮 → /admin/users/new。

- [ ] **Step 5: 写创建用户页 /admin/users/new**

表单（邮箱、初始密码、姓名、角色 select），POST `/api/admin/users`，成功跳 /admin/users，toast。superAdmin 可选 role，admin 固定 user。

- [ ] **Step 6: 写编辑用户页 /admin/users/[id]**

展示用户信息，可改 name/role/avatar、重置密码、删除（不能删自己——按钮 disabled）。

- [ ] **Step 7: 写数据浏览页 /admin/data**

仅 superAdmin（layout 已挡 user，但此页额外校验 superAdmin 否则 redirect /admin）。调四个 admin/data API，按用户分组展示 agents/workflows/knowledge-bases/conversations 列表。

- [ ] **Step 8: Commit**

```bash
git add "src/app/(admin)" messages/zh-CN.json messages/en.json
git commit -m "feat(auth): add /admin backend pages (overview, users CRUD, superAdmin data browsing)"
```

---

## 阶段 6：收尾

### Task 18: 全量测试 + 手动迁移运行说明

**Files:**
- Modify: `docs/UI_UX_OPTIMIZATION.md`（标记用户头像/账户入口已完成）
- Modify: `docs/superpowers/specs/2026-07-29-auth-multi-user-design.md`（可选，记录迁移命令）

- [ ] **Step 1: 跑全量测试**

Run: `pnpm test`
Expected: 全部 PASS（注意：现有测试若有遗漏未更新的会因 401 失败，逐个修复）

- [ ] **Step 2: 手动迁移运行说明文档**

在 spec 末尾追加"执行迁移"章节，告诉用户在改 NOT NULL（Task 5）前运行：

```bash
MIGRATE_ADMIN_EMAIL=you@example.com MIGRATE_ADMIN_PASSWORD='生成一个强密码' pnpm exec tsx scripts/migrate-add-auth.ts
```
并把账号信息记录下来。建议用一个生成的强密码（如 `openssl rand -base64 18`）。

- [ ] **Step 3: Commit**

```bash
git add docs/
git commit -m "docs: record auth migration instructions"
```

---

## Self-Review 结果

**1. Spec 覆盖：**
- 数据模型（users/sessions/5 表 userId）→ Task 2/3/5 ✅
- 认证机制（bcrypt/cookie/getCurrentUser/requireUser）→ Task 2/13 ✅
- 角色模型（三级 + 权限矩阵）→ Task 16 requireAdmin/requireSuperAdmin ✅
- 路由保护（页面 layout + API requireUser）→ Task 15/各 API task ✅
- 数据迁移 → Task 4 ✅
- 登录页 → Task 14 ✅
- 主站用户区域 → Task 15 ✅
- /admin 后台 → Task 16/17 ✅
- 受影响 API 全量 → Task 6-11 + 16 ✅
- 新增依赖 → Task 1 ✅
- i18n → Task 14/15/17 ✅
- 默认账号 → Task 4 迁移脚本 ✅
- 不改项（share/公开文件 GET）→ Task 11 Step 3 注明 ✅

**2. 占位符扫描：** 无 TBD/TODO，所有步骤含完整代码。Task 6-11 中"同理改造其他 route"已用具体模式说明（requireUser + getOwnedBy + 404），并要求每步跑测试。

**3. 类型一致性：** `getAgentOwnedBy`/`getWorkflowOwnedBy`/`getKnowledgeBaseOwnedBy`/`getConversationOwnedBy` 命名统一；`requireUser`/`requireAdmin`/`requireSuperAdmin` 签名一致；`authedUser()` 在 Task 6 定义后 Task 7-11/13 复用。`SafeUser` 类型贯穿。

无问题。

---

**Plan complete and saved to `docs/superpowers/plans/2026-07-29-auth-multi-user.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - 我每个 Task 派一个全新 subagent 执行，Task 之间做两阶段评审，迭代快、上下文干净

**2. Inline Execution** - 在当前会话里用 executing-plans 批量执行，带 checkpoint 评审

哪种方式？
