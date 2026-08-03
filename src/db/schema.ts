import { mysqlTable, varchar, text, int, float, timestamp, json, mysqlEnum } from "drizzle-orm/mysql-core";
import { createId } from "@/lib/id";
import type { WorkflowNode, WorkflowEdge, WorkflowVariable } from "@/types/workflow";

export const aiProviderConfig = mysqlTable("ai_provider_config", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
  userId: varchar("user_id", { length: 36 }).notNull(),
  providerType: mysqlEnum("provider_type", ["openai", "anthropic", "azure", "ollama"]).notNull().default("openai"),
  baseUrl: varchar("base_url", { length: 255 }).notNull(),
  model: varchar("model", { length: 255 }).notNull(),
  apiKey: varchar("api_key", { length: 255 }).notNull(),
  embeddingModel: varchar("embedding_model", { length: 255 }),
  webSearchProvider: varchar("web_search_provider", { length: 50 }),
  webSearchApiKey: varchar("web_search_api_key", { length: 255 }),
  updatedAt: timestamp("updated_at", { mode: "date", fsp: 6 })
    .notNull()
    .defaultNow()
    .$defaultFn(() => new Date()),
});

export const agents = mysqlTable("agents", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
  userId: varchar("user_id", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  avatar: varchar("avatar", { length: 255 }).notNull().default(""),
  tags: json("tags").notNull().$type<string[]>().default([]),
  systemPrompt: text("system_prompt").notNull(),
  temperature: float("temperature").notNull().default(0.7),
  maxTokens: int("max_tokens").notNull().default(1024),
  topP: float("top_p").notNull().default(1),
  model: varchar("model", { length: 255 }),
  memoryWindowSize: int("memory_window_size").notNull().default(20),
  memoryStrategy: mysqlEnum("memory_strategy", ["window", "summary_window"]).notNull().default("window"),
  toolsConfig: json("tools_config").$type<unknown | null>(),
  suggestedPrompts: json("suggested_prompts").notNull().$type<string[]>().default([]),
  createdAt: timestamp("created_at", { mode: "date", fsp: 6 })
    .notNull()
    .defaultNow()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at", { mode: "date", fsp: 6 })
    .notNull()
    .defaultNow()
    .$defaultFn(() => new Date()),
});

export const conversations = mysqlTable("conversations", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
  userId: varchar("user_id", { length: 36 }).notNull(),
  agentId: varchar("agent_id", { length: 36 })
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull().default("New conversation"),
  createdAt: timestamp("created_at", { mode: "date", fsp: 6 })
    .notNull()
    .defaultNow()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at", { mode: "date", fsp: 6 })
    .notNull()
    .defaultNow()
    .$defaultFn(() => new Date()),
  summary: text("summary"),
  summaryUpTo: varchar("summary_up_to", { length: 36 }),
});

export const messages = mysqlTable("messages", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
  conversationId: varchar("conversation_id", { length: 36 })
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  model: varchar("model", { length: 255 }),
  promptTokens: int("prompt_tokens"),
  completionTokens: int("completion_tokens"),
  totalTokens: int("total_tokens"),
  durationMs: int("duration_ms"),
  attachments: json("attachments").$type<Array<{ id: string; filename: string; mimetype: string; size: number }>>(),
  toolCalls: json("tool_calls").$type<Array<{
    toolName: string;
    displayName: string;
    args: Record<string, unknown>;
    result: string;
  }>>(),
  activeSkills: json("active_skills").$type<Array<{ name: string; icon: string }>>(),
  createdAt: timestamp("created_at", { mode: "date", fsp: 6 })
    .notNull()
    .defaultNow()
    .$defaultFn(() => new Date()),
});

export const attachments = mysqlTable("attachments", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
  filename: varchar("filename", { length: 255 }).notNull(),
  mimetype: varchar("mimetype", { length: 100 }).notNull(),
  size: int("size").notNull(),
  storagePath: varchar("storage_path", { length: 500 }).notNull(),
  messageId: varchar("message_id", { length: 36 })
    .references(() => messages.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date", fsp: 6 })
    .notNull()
    .defaultNow()
    .$defaultFn(() => new Date()),
});

export const workflows = mysqlTable("workflows", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
  userId: varchar("user_id", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  graph: json("graph").notNull().$type<{
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    variables?: WorkflowVariable[];
  }>(),
  /**
   * 已发布版本号（指向 workflow_versions.versionNumber）。
   * 运行视图触发的正式运行锁定该版本的 graph 快照；编辑器修改草稿不影响它。
   * 为 null 表示从未发布（兼容存量数据：此时正式运行回退到当前草稿）。
   */
  publishedVersionNumber: int("published_version_number"),
  createdAt: timestamp("created_at", { mode: "date", fsp: 6 })
    .notNull()
    .defaultNow()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at", { mode: "date", fsp: 6 })
    .notNull()
    .defaultNow()
    .$defaultFn(() => new Date()),
});

export const workflowRuns = mysqlTable("workflow_runs", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
  workflowId: varchar("workflow_id", { length: 36 })
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  status: mysqlEnum("status", ["queued", "running", "waiting_for_input", "completed", "failed", "paused"]).notNull(),
  input: text("input").notNull(),
  currentNodeId: varchar("current_node_id", { length: 255 }),
  context: json("context").notNull().$type<Record<string, string>>().default({}),
  error: text("error"),
  versionNumber: int("version_number"),
  createdAt: timestamp("created_at", { mode: "date", fsp: 6 })
    .notNull()
    .defaultNow()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at", { mode: "date", fsp: 6 })
    .notNull()
    .defaultNow()
    .$defaultFn(() => new Date()),
});

export const workflowStepLogs = mysqlTable("workflow_step_logs", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
  runId: varchar("run_id", { length: 36 })
    .notNull()
    .references(() => workflowRuns.id, { onDelete: "cascade" }),
  nodeId: varchar("node_id", { length: 255 }).notNull(),
  nodeType: varchar("node_type", { length: 255 }).notNull(),
  input: text("input").notNull(),
  output: text("output"),
  status: mysqlEnum("status", ["running", "completed", "failed", "skipped"]).notNull(),
  startedAt: timestamp("started_at", { mode: "date", fsp: 6 })
    .notNull()
    .defaultNow()
    .$defaultFn(() => new Date()),
  completedAt: timestamp("completed_at", { mode: "date", fsp: 6 }),
});

/**
 * 工作流执行作业队列。工作流可能运行数分钟（多次 LLM 调用），
 * 不能在 HTTP 请求内同步执行；用 MySQL 做载体队列避免引入 Redis 等新基础设施。
 * 领取采用乐观锁（条件 UPDATE + affectedRows），崩溃通过租约过期感知。
 */
export const workflowJobs = mysqlTable("workflow_jobs", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
  runId: varchar("run_id", { length: 36 })
    .notNull()
    .references(() => workflowRuns.id, { onDelete: "cascade" }),
  /** 执行类型，对应 executeRunJob 的分发分支 */
  kind: mysqlEnum("kind", ["trigger", "resume", "retry", "step"]).notNull(),
  /** 执行参数：resume 的 input、retry 的 nodeId、step 的 mode 等 */
  payload: json("payload").notNull().$type<Record<string, unknown>>().default({}),
  status: mysqlEnum("status", ["pending", "processing", "done", "failed"]).notNull().default("pending"),
  attempts: int("attempts").notNull().default(0),
  /** 当前持有者标识，仅用于可观测性 */
  workerId: varchar("worker_id", { length: 64 }),
  /** 租约到期时间；过期即认为持有者已崩溃 */
  leaseExpiresAt: timestamp("lease_expires_at", { mode: "date", fsp: 6 }),
  error: text("error"),
  createdAt: timestamp("created_at", { mode: "date", fsp: 6 })
    .notNull()
    .defaultNow()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at", { mode: "date", fsp: 6 })
    .notNull()
    .defaultNow()
    .$defaultFn(() => new Date()),
});

export const knowledgeBases = mysqlTable("knowledge_bases", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
  userId: varchar("user_id", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull().default(""),
  embeddingModel: varchar("embedding_model", { length: 255 }),
  chunkSize: int("chunk_size").notNull().default(500),
  chunkOverlap: int("chunk_overlap").notNull().default(50),
  createdAt: timestamp("created_at", { mode: "date", fsp: 6 })
    .notNull().defaultNow().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at", { mode: "date", fsp: 6 })
    .notNull().defaultNow().$defaultFn(() => new Date()),
});

export const knowledgeDocuments = mysqlTable("knowledge_documents", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
  knowledgeBaseId: varchar("knowledge_base_id", { length: 36 }).notNull()
    .references(() => knowledgeBases.id, { onDelete: "cascade" }),
  filename: varchar("filename", { length: 255 }).notNull(),
  mimetype: varchar("mimetype", { length: 100 }).notNull(),
  size: int("size").notNull(),
  storagePath: varchar("storage_path", { length: 500 }).notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).notNull(),
  chunkCount: int("chunk_count").notNull().default(0),
  error: text("error"),
  createdAt: timestamp("created_at", { mode: "date", fsp: 6 })
    .notNull().defaultNow().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at", { mode: "date", fsp: 6 })
    .notNull().defaultNow().$defaultFn(() => new Date()),
});

export const knowledgeChunks = mysqlTable("knowledge_chunks", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
  documentId: varchar("document_id", { length: 36 }).notNull()
    .references(() => knowledgeDocuments.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  embedding: json("embedding").notNull().$type<number[]>(),
  chunkIndex: int("chunk_index").notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { mode: "date", fsp: 6 })
    .notNull().defaultNow().$defaultFn(() => new Date()),
});

export const agentKnowledgeBases = mysqlTable("agent_knowledge_bases", {
  agentId: varchar("agent_id", { length: 36 }).notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  knowledgeBaseId: varchar("knowledge_base_id", { length: 36 }).notNull()
    .references(() => knowledgeBases.id, { onDelete: "cascade" }),
});

export const conversationShares = mysqlTable("conversation_shares", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
  conversationId: varchar("conversation_id", { length: 36 }).notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 64 }).notNull().unique(),
  createdAt: timestamp("created_at", { mode: "date", fsp: 6 })
    .notNull().defaultNow().$defaultFn(() => new Date()),
  revokedAt: timestamp("revoked_at", { mode: "date", fsp: 6 }),
});

export const workflowVersions = mysqlTable("workflow_versions", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
  workflowId: varchar("workflow_id", { length: 36 }).notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  versionNumber: int("version_number").notNull(),
  graph: json("graph").notNull().$type<{ nodes: WorkflowNode[]; edges: WorkflowEdge[]; variables?: WorkflowVariable[] }>(),
  createdAt: timestamp("created_at", { mode: "date", fsp: 6 })
    .notNull().defaultNow().$defaultFn(() => new Date()),
});

export const agentTeamMembers = mysqlTable("agent_team_members", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
  supervisorAgentId: varchar("supervisor_agent_id", { length: 36 }).notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  memberAgentId: varchar("member_agent_id", { length: 36 }).notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  roleDescription: text("role_description"),
  createdAt: timestamp("created_at", { mode: "date", fsp: 6 })
    .notNull().defaultNow().$defaultFn(() => new Date()),
});

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

export const agentSkills = mysqlTable("agent_skills", {
  agentId: varchar("agent_id", { length: 36 }).notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  skillId: varchar("skill_id", { length: 36 }).notNull()
    .references(() => skills.id, { onDelete: "cascade" }),
});

export const customTools = mysqlTable("custom_tools", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
  userId: varchar("user_id", { length: 36 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 255 }).notNull().default(""),
  tags: json("tags").notNull().$type<string[]>().default([]),
  type: mysqlEnum("type", ["http", "prompt", "mcp"]).notNull(),
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
  mcpConfig: json("mcp_config").$type<{
    serverUrl: string;
    toolName: string;
    authToken?: string;
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
export const messageTraces = mysqlTable("message_traces", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
  messageId: varchar("message_id", { length: 36 }).notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  systemPrompt: text("system_prompt"),
  skillsInjected: json("skills_injected").$type<Array<{ name: string; icon: string }>>(),
  toolsAvailable: json("tools_available").$type<string[]>(),
  ragContext: text("rag_context"),
  summaryUsed: text("summary_used"),
  modelUsed: varchar("model_used", { length: 255 }),
  tokenDetails: json("token_details").$type<{ input?: number; output?: number; total?: number }>(),
  latencyMs: int("latency_ms"),
  maxSteps: int("max_steps"),
  stepLimitReached: int("step_limit_reached"),
  createdAt: timestamp("created_at", { mode: "date", fsp: 6 })
    .notNull().defaultNow().$defaultFn(() => new Date()),
});

export const evalCases = mysqlTable("eval_cases", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
  userId: varchar("user_id", { length: 36 }).notNull(),
  agentId: varchar("agent_id", { length: 36 }).notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  input: text("input").notNull(),
  expectedOutput: text("expected_output"),
  criteria: text("criteria").notNull(),
  createdAt: timestamp("created_at", { mode: "date", fsp: 6 })
    .notNull().defaultNow().$defaultFn(() => new Date()),
});

export const evalRuns = mysqlTable("eval_runs", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
  caseId: varchar("case_id", { length: 36 }).notNull()
    .references(() => evalCases.id, { onDelete: "cascade" }),
  actualOutput: text("actual_output").notNull(),
  score: float("score"),
  feedback: text("feedback"),
  model: varchar("model", { length: 255 }),
  durationMs: int("duration_ms"),
  createdAt: timestamp("created_at", { mode: "date", fsp: 6 })
    .notNull().defaultNow().$defaultFn(() => new Date()),
});

export const scheduledTasks = mysqlTable("scheduled_tasks", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
  userId: varchar("user_id", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["agent_chat", "workflow_run"]).notNull(),
  targetId: varchar("target_id", { length: 36 }).notNull(),
  input: text("input").notNull(),
  cronExpression: varchar("cron_expression", { length: 50 }).notNull(),
  enabled: int("enabled").notNull().default(1),
  lastRunAt: timestamp("last_run_at", { mode: "date", fsp: 6 }),
  nextRunAt: timestamp("next_run_at", { mode: "date", fsp: 6 }),
  createdAt: timestamp("created_at", { mode: "date", fsp: 6 })
    .notNull().defaultNow().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at", { mode: "date", fsp: 6 })
    .notNull().defaultNow().$defaultFn(() => new Date()),
});
