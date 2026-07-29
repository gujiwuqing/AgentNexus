# 设计规格：用户认证与多用户数据隔离

> 创建时间：2026-07-29

---

## 1. 概述

为 AgentNexus 添加完整的用户认证系统，实现多用户数据隔离，并提供管理后台。

### 核心目标

- 用户通过邮箱+密码登录，未登录不可访问主站功能
- 每个用户只能看到自己的 Agent/对话/工作流/知识库/AI 配置
- superAdmin 可在 `/admin` 后台浏览全部用户数据
- admin 和 superAdmin 都可以在后台创建/管理用户账号
- 现有数据迁移到一个默认 superAdmin 账号下，不丢失

---

## 2. 角色模型

三级角色：`user` | `admin` | `superAdmin`

| 能力 | user | admin | superAdmin |
|------|------|-------|------------|
| 使用自己的 Agent/对话/工作流/知识库 | ✅ | ✅ | ✅ |
| 进入 `/admin` 后台 | ❌ | ✅ | ✅ |
| 创建/管理用户账号 | ❌ | ✅ | ✅ |
| 浏览**其他用户**的业务数据 | ❌ | ❌ | ✅ |

约束：
- admin 只能创建 `role=user` 的账号
- superAdmin 可以创建任意角色的账号
- admin 不能修改比自己角色高或同级的人的信息
- 用户不能删除自己

---

## 3. 数据模型

### 3.1 新增表

**`users`**

| 字段 | 类型 | 约束 |
|------|------|------|
| id | varchar(36) | PK |
| email | varchar(255) | UNIQUE, NOT NULL |
| username | varchar(100) | UNIQUE, nullable（预留） |
| passwordHash | varchar(255) | NOT NULL |
| name | varchar(100) | NOT NULL |
| avatar | varchar(255) | nullable（emoji 或图片 URL） |
| role | enum('user','admin','superAdmin') | NOT NULL, default 'user' |
| createdAt | timestamp | NOT NULL |
| updatedAt | timestamp | NOT NULL |

**`sessions`**

| 字段 | 类型 | 约束 |
|------|------|------|
| id | varchar(64) | PK（随机 token，作为 Cookie 值） |
| userId | varchar(36) | FK → users.id, ON DELETE CASCADE |
| expiresAt | timestamp | NOT NULL |
| createdAt | timestamp | NOT NULL |

### 3.2 现有表加 userId

以下表新增 `userId varchar(36)` 外键引用 `users.id`（先可为空，迁移后改为 NOT NULL）：

- `agents`
- `workflows`
- `knowledge_bases`
- `conversations`
- `ai_provider_config`

`conversations` 虽然逻辑上从属于 agent，但直接加 userId 是因为很多 API 路由直接按 conversationId 查询（不经过 agent），加上 userId 可以简单地在查询时过滤，避免深层 join。

不加 userId 的表（通过父级关系间接归属）：`messages`、`attachments`、`workflow_runs`、`workflow_step_logs`、`knowledge_documents`、`knowledge_chunks`、`agent_knowledge_bases`、`conversation_shares`、`workflow_versions`、`agent_team_members`。

---

## 4. 认证机制

### 4.1 密码

- 使用 `bcryptjs` 做哈希（纯 JS，不需要 native addon）
- 登录时 `bcrypt.compare()`，注册/创建时 `bcrypt.hash(input, 12)`

### 4.2 Session

- 登录成功后，生成 64 字符随机 hex token（`crypto.randomBytes(32).toString("hex")`）
- 插入 `sessions` 表，`expiresAt` = 当前时间 + 30 天
- Cookie 名称：`session_token`
- Cookie 属性：`HttpOnly`, `Secure`（prod），`SameSite=Lax`, `Path=/`, `MaxAge=30天`
- 每次请求校验通过后，如果距离过期不足 7 天，自动续期（把 expiresAt 往后推 30 天）

### 4.3 获取当前用户

服务端工具函数 `getCurrentUser()`：
1. 从 Cookie 中取 `session_token`
2. 查 `sessions` 表，验证存在且 `expiresAt > now()`
3. join `users` 表拿出用户信息（不含 passwordHash）
4. 返回 `{ id, email, name, avatar, role }` 或 `null`

### 4.4 路由保护

**页面**：
- `(app)/layout.tsx` 中调用 `getCurrentUser()`，无效则 `redirect("/login")`
- `(admin)/layout.tsx` 中额外检查 `role !== "user"`，否则 `redirect("/chat")`
- `/login` 页面：已登录则 `redirect("/chat")`
- `/share/[token]`：不做鉴权

**API**：
- 封装 `requireUser()`：从 Cookie 取 token → 查 session → 返回 user 或 throw 401
- 每个受保护的 API route 开头调用
- 传 userId 给所有数据查询/操作函数做过滤

不使用 Next.js middleware.ts 做全局拦截（原因：middleware 跑在 Edge Runtime，而 mysql2 不兼容 Edge）。

---

## 5. 数据迁移策略

1. Schema 变更：新增 `users`、`sessions` 表；给 `agents`/`workflows`/`knowledge_bases`/`conversations`/`ai_provider_config` 加 `userId` 列（nullable）
2. 写迁移脚本 `scripts/migrate-add-auth.ts`：
   - 创建默认 superAdmin 账号（邮箱+密码写死在脚本参数里，跑完告诉用户）
   - 把所有现有数据行的 `userId` 回填为该账号的 id
3. 回填后，把 5 张表的 `userId` 改为 NOT NULL
4. 运行 `drizzle-kit push` 同步 schema

不删除、不修改任何现有业务数据。

---

## 6. 登录页 UI

路由：`/login`（不在 `(app)` group 内，不套 sidebar layout）

组件：
- 品牌 Logo + "AgentNexus" 标题
- 邮箱输入框
- 密码输入框
- "登录" 按钮
- 错误用 Toast 提示
- 没有"注册"入口
- 没有"忘记密码"入口（预留后续添加）

---

## 7. 主站用户区域

**Sidebar 底部**（替换当前 LocaleSwitcher + ThemeToggle 区域的上方）：
- 用户 Avatar + Name，右侧展开箭头
- 点击后展开 DropdownMenu：
  - 个人信息
  - 管理后台（仅 admin/superAdmin 可见）
  - 退出登录

**个人信息弹窗**（Dialog）：
- 修改名字
- 修改头像（输入 emoji 或 URL）
- 修改密码（输入旧密码 + 新密码 + 确认）

---

## 8. /admin 后台

### 8.1 路由结构

使用独立 route group `(admin)`，有自己的 layout（左侧极简导航：概览、用户管理、数据浏览）。

### 8.2 页面

| 路由 | 功能 | admin | superAdmin |
|------|------|-------|------------|
| `/admin` | 概览（注册用户数、总 Agent 数、总对话量） | ✅ | ✅ |
| `/admin/users` | 用户列表 + 创建按钮 | ✅ | ✅ |
| `/admin/users/new` | 创建用户表单 | ✅ | ✅ |
| `/admin/users/[id]` | 编辑/重置密码/删除 | ✅ | ✅ |
| `/admin/data` | 按用户分组浏览全量数据 | ❌ | ✅ |

### 8.3 API

- `GET /api/admin/users` — 用户列表
- `POST /api/admin/users` — 创建用户
- `GET /api/admin/users/[id]` — 用户详情
- `PATCH /api/admin/users/[id]` — 编辑用户
- `DELETE /api/admin/users/[id]` — 删除用户
- `GET /api/admin/stats` — 后台概览统计
- `GET /api/admin/data/agents` — 全量 Agent（superAdmin only）
- `GET /api/admin/data/workflows` — 全量工作流（superAdmin only）
- `GET /api/admin/data/knowledge-bases` — 全量知识库（superAdmin only）
- `GET /api/admin/data/conversations` — 全量对话（superAdmin only）

---

## 9. 受影响的现有 API（鉴权改造）

所有以下路由需要加 `requireUser()` 并传 userId 做数据过滤：

- `/api/agents` (GET, POST)
- `/api/agents/[id]` (GET, PATCH, DELETE)
- `/api/agents/[id]/conversations` (GET)
- `/api/agents/[id]/knowledge-bases` (GET, PUT)
- `/api/conversations/[id]` (GET, PATCH, DELETE)
- `/api/conversations/[id]/messages` (POST)
- `/api/conversations/[id]/messages/assistant` (POST)
- `/api/conversations/[id]/shares` (POST, DELETE)
- `/api/messages/[id]` (DELETE)
- `/api/workflows` (GET, POST)
- `/api/workflows/[id]` (GET, PATCH, DELETE)
- `/api/workflows/[id]/runs` (GET, POST)
- `/api/workflows/[id]/versions` (GET)
- `/api/workflows/[id]/versions/[n]/restore` (POST)
- `/api/workflow-runs/[id]` (GET)
- `/api/workflow-runs/[id]/resume` (POST)
- `/api/workflow-runs/[id]/retry` (POST)
- `/api/knowledge-bases` (GET, POST)
- `/api/knowledge-bases/[id]` (GET, PATCH, DELETE)
- `/api/knowledge-bases/[id]/documents` (GET, POST)
- `/api/knowledge-bases/[id]/documents/[docId]` (DELETE)
- `/api/knowledge-bases/[id]/documents/[docId]/reindex` (POST)
- `/api/knowledge-bases/[id]/documents/[docId]/content` (GET)
- `/api/knowledge-bases/[id]/test-retrieval` (POST)
- `/api/settings/ai-provider` (GET, PUT)
- `/api/settings/ai-provider/test` (POST)
- `/api/dashboard/stats` (GET)
- `/api/files/upload` (POST)

**不改**（保持无鉴权）：
- `/share/[token]` 页面
- `/api/files/[id]` GET（分享页引用附件）

---

## 10. 新增依赖

- `bcryptjs`（密码哈希）
- `@types/bcryptjs`（类型）

不引入 next-auth/iron-session/jose 等第三方 session 框架——逻辑简单，自己写更可控。

---

## 11. 国际化

新增翻译键：
- `auth.login` / `auth.logout` / `auth.email` / `auth.password` / `auth.loginButton` / `auth.loginError`
- `profile.title` / `profile.name` / `profile.avatar` / `profile.changePassword` / `profile.currentPassword` / `profile.newPassword` / `profile.confirmPassword`
- `admin.overview` / `admin.users` / `admin.createUser` / `admin.editUser` / `admin.data` / `admin.confirmDelete`

中英文双语同步。

---

## 12. 默认账号

迁移脚本完成后创建的超级管理员账号信息会在运行后打印到控制台，并告诉用户。格式如：
- 邮箱：`admin@agentnexus.local`
- 密码：由脚本生成的随机强密码
- 角色：`superAdmin`
