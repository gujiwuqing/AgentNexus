import { mysqlTable, varchar, text, int, float, timestamp, json, mysqlEnum } from "drizzle-orm/mysql-core";
import { createId } from "@/lib/id";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";

export const aiProviderConfig = mysqlTable("ai_provider_config", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
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
  toolsConfig: json("tools_config").$type<unknown | null>(),
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
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  graph: json("graph").notNull().$type<{
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  }>(),
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
  status: mysqlEnum("status", ["running", "waiting_for_input", "completed", "failed"]).notNull(),
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

export const knowledgeBases = mysqlTable("knowledge_bases", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(createId),
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
  graph: json("graph").notNull().$type<{ nodes: WorkflowNode[]; edges: WorkflowEdge[] }>(),
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
