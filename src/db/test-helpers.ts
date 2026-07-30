import { db } from "./index";
import {
  agents,
  conversations,
  messages,
  aiProviderConfig,
  workflowStepLogs,
  workflowJobs,
  workflowRuns,
  workflows,
  knowledgeBases,
  knowledgeDocuments,
  knowledgeChunks,
  agentKnowledgeBases,
  conversationShares,
  workflowVersions,
  agentTeamMembers,
  users,
  sessions,
} from "./schema";
import { createUser } from "@/server/users";
import { createSession } from "@/server/sessions";
import type { SafeUser } from "@/server/users";

export async function clearAllTables() {
  await db.delete(sessions);
  await db.delete(conversationShares);
  await db.delete(knowledgeChunks);
  await db.delete(knowledgeDocuments);
  await db.delete(agentKnowledgeBases);
  await db.delete(agentTeamMembers);
  await db.delete(workflowVersions);
  await db.delete(messages);
  await db.delete(conversations);
  await db.delete(workflowStepLogs);
  await db.delete(workflowJobs);
  await db.delete(workflowRuns);
  await db.delete(workflows);
  await db.delete(agents);
  await db.delete(aiProviderConfig);
  await db.delete(knowledgeBases);
  await db.delete(users);
}

let authedCounter = 0;

/**
 * 测试辅助：创建一个用户 + session，返回用户信息和可用于请求头的 cookie 字符串。
 * 调用方：`const { user, cookie } = await authedUser("admin");`
 * 然后构造请求时带 `headers: { cookie }`。
 */
export async function authedUser(role: "user" | "admin" | "superAdmin" = "user"): Promise<{ user: SafeUser; cookie: string }> {
  authedCounter += 1;
  const row = await createUser({
    email: `u${authedCounter}-${Date.now()}@test.com`,
    password: "pw12345",
    name: `U${authedCounter}`,
    role,
  });
  const session = await createSession(row!.id);
  return { user: row!, cookie: `session_token=${session.id}` };
}
