<div align="center">

# AgentNexus

**自托管的多智能体编排平台**

创建 AI 智能体、与之流式对话，并用可视化工作流将多个智能体串联成带条件分支、并行、循环与人工介入的自动化流程。

<p>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-3-38BDF8?logo=tailwindcss&logoColor=white" />
  <img alt="Drizzle ORM" src="https://img.shields.io/badge/Drizzle_ORM-C5F74F?logo=drizzle&logoColor=black" />
  <img alt="MySQL" src="https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white" />
  <img alt="Vercel AI SDK" src="https://img.shields.io/badge/Vercel_AI_SDK-v4-000000?logo=vercel&logoColor=white" />
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white" />
  <img alt="Vitest" src="https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white" />
</p>

**中文** · [English](./README.en.md)

</div>

---

## ✨ 核心能力

| 模块 | 说明 |
| --- | --- |
| 🤖 **智能体（Agents）** | 自定义系统提示词、模型参数（temperature / maxTokens / topP）、记忆窗口、建议提示词、工具配置；支持按智能体覆盖全局模型供应商 |
| 💬 **对话（Chat）** | 流式响应、Markdown 渲染、附件上传、按 token 生成分享链接 |
| 🔀 **工作流（Workflows）** | 基于 React Flow 的可视化编辑器，支持 8 种节点类型、版本管理、异步执行队列、运行记录与单步调试 |
| 📚 **知识库（Knowledge / RAG）** | 文档上传、分块、重建索引、检索测试，并可挂载到智能体 |
| 📊 **仪表盘（Dashboard）** | 使用量与对话统计 |
| 👥 **多用户与权限** | 登录鉴权、管理员后台（用户管理 / 全站数据） |
| 🌍 **国际化** | 内置英文与简体中文（`next-intl`） |
| 🌓 **主题** | 明暗主题切换（`next-themes`） |

### 工作流节点类型

`agent`（调用智能体）、`condition`（条件分支）、`transform`（文本处理）、`human_input`（等待人工输入）、`http_request`（调用外部 API）、`code_execute`（代码执行）、`delay`（延时）、`variable_aggregate`（变量聚合）。

---

## 🧱 技术栈

- **框架**：[Next.js 15](https://nextjs.org/)（App Router）+ [React 19](https://react.dev/) + TypeScript
- **样式**：[Tailwind CSS v3](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)（new-york 风格）
- **数据请求**：[TanStack Query](https://tanstack.com/query)
- **数据库**：MySQL 8 + [Drizzle ORM](https://orm.drizzle.team/)
- **AI**：[Vercel AI SDK v4](https://sdk.vercel.ai/)（OpenAI / Anthropic / Azure）
- **可视化编辑器**：[@xyflow/react](https://reactflow.dev/)（React Flow）
- **校验**：[Zod](https://zod.dev/)
- **测试**：[Vitest](https://vitest.dev/)
- **包管理**：**pnpm**（请勿使用 npm/yarn）

---

## 🚀 快速开始

### 环境要求

- Node.js **≥ 20**（开发环境使用 22.x）
- pnpm
- MySQL **8**（本地开发默认库名 `agentnexus`，测试库 `agentnexus_test`）

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制示例文件并按需修改：

```bash
cp .env.example .env.local
```

关键变量：

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | 开发数据库连接串，如 `mysql://user:pass@127.0.0.1:3306/agentnexus` |
| `DATABASE_URL_TEST` | 测试数据库连接串（`agentnexus_test`） |
| `WORKFLOW_WORKER_ENABLED` | 是否启动进程内工作流 worker，self-hosted 保持 `true`，serverless 设为 `false` |
| `WORKFLOW_WORKER_CONCURRENCY` | 并发执行的工作流数上限（默认 `2`） |
| `WORKFLOW_WORKER_POLL_MS` | 队列空闲时的轮询间隔，毫秒（默认 `2000`） |
| `WORKFLOW_NODE_TIMEOUT_MS` | 单节点执行超时，毫秒（默认 `300000`） |
| `WORKFLOW_TICK_SECRET` | 外部 cron 驱动队列的共享密钥；不设置时 `/api/workflow-jobs/tick` 返回 404 |

> AI 模型供应商（baseUrl / model / apiKey）在应用内的 **设置** 页配置，并可按智能体单独覆盖，无需写入环境变量。

### 3. 初始化数据库

先在 MySQL 中创建对应数据库，再把 schema 推送上去：

```bash
pnpm run db:push        # 将 src/db/schema.ts 同步到 DATABASE_URL 指向的库
```

### 4. 启动开发服务器

```bash
pnpm run dev
```

访问 [http://localhost:3000](http://localhost:3000)。

---

## 📜 常用脚本

```bash
pnpm run dev              # 启动开发服务器
pnpm run build            # 生产构建
pnpm run start            # 启动生产服务
pnpm test                 # 运行全部 vitest 用例
pnpm test -- <pattern>    # 运行子集，如 pnpm test -- workflow-runs.test
pnpm run db:push          # 将 schema 推送到 MySQL
pnpm run templates:reset  # 重置为内置的专业模板
pnpm run prompts:backfill # 回填智能体建议提示词
```

> 测试共享同一个 MySQL 测试库（`agentnexus_test`），由 `vitest.setup.ts` 在启动时 DROP/CREATE 重建并推送 schema；因此测试**串行执行**（`fileParallelism: false`），每个用例在 `afterEach` 清空所有表。

---

## 🗂️ 项目结构

```
src/
├── app/
│   ├── (app)/            # 登录后的主应用（chat / agents / workflows / knowledge / dashboard / settings）
│   ├── (admin)/          # 管理员后台
│   ├── api/**/route.ts   # API 路由层（仅解析请求 + 校验 + 调用服务层）
│   ├── login/            # 登录页
│   └── share/[token]/    # 对话分享页
├── components/           # UI 组件（chat / agents / workflow / knowledge / nav / ui ...）
├── server/               # 服务层：每种资源一个文件，直接操作 Drizzle
├── db/                   # Drizzle schema 与连接
├── lib/                  # ai / workflow 引擎 / files / knowledge / validation / tools ...
├── hooks/                # TanStack Query hooks
├── i18n/                 # 国际化配置
└── types/                # 领域类型定义
messages/                 # 翻译文案（en / zh-CN）
docs/superpowers/         # 各阶段设计规格与实现计划
```

### 后端三层架构

每个功能都遵循相同的分层，不跳层：

1. **`src/app/api/**/route.ts`** — 解析请求、用 `src/lib/validation/*` 的 Zod schema 校验、调用服务层，用 `apiOk` / `apiError` 包装响应。路由层不含业务逻辑。
2. **`src/server/*.ts`** — 每种资源一个文件（`agents.ts`、`conversations.ts`、`workflows.ts`、`workflow-runs.ts` …），纯异步函数直接与 Drizzle 交互。
3. **`src/db/schema.ts`** — Drizzle 表定义（MySQL）。主键为 `varchar(36)` 由 `createId()` 生成；外键统一 `onDelete: "cascade"`。

### 两个数据域

- **Agent / Conversation / Message** —— 对话侧。响应经 `streamAgentReply`（AI SDK `streamText`）流式返回。
- **Workflow / WorkflowRun / WorkflowStepLog** —— 编排侧。工作流节点调用智能体走**非流式**的 `generateAgentReply`。

### 工作流执行引擎

`src/lib/workflow/engine.ts` 的 `executeWorkflow()` 是纯函数，通过 `EngineCallbacks` 依赖注入，不含任何 DB/IO；`src/server/workflow-runs.ts` 的 `makeCallbacks()` 是唯一将引擎接入 Drizzle 与 LLM 的地方。工作流可能运行数分钟，因此不在 HTTP 请求内同步执行，而是入队后由 worker 消费、前端轮询进度。

---

## 🌐 部署

- **Self-hosted（`next start`）**：保持 `WORKFLOW_WORKER_ENABLED=true`，进程内 worker 会自动消费工作流队列。
- **Serverless**：设 `WORKFLOW_WORKER_ENABLED=false`，并配置外部 cron 定时调用队列驱动端点：

  ```bash
  curl -X POST -H "x-workflow-tick-secret: <secret>" https://<host>/api/workflow-jobs/tick
  ```

  该端点需设置 `WORKFLOW_TICK_SECRET`，否则返回 404 以避免无鉴权的公开执行入口。

---

## 📖 文档

`docs/superpowers/specs/` 与 `docs/superpowers/plans/` 保存了各阶段的设计规格与实现计划，可用于理解某处**为何**这样设计。请注意：代码本身才是当前行为的最终依据。
