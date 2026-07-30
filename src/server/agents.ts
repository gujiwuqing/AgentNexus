import { eq, sql, and } from "drizzle-orm";
import { db } from "@/db";
import { agents, conversations } from "@/db/schema";
import { createId } from "@/lib/id";
import type { AgentInput, AgentUpdateInput } from "@/lib/validation/agent";

export async function createAgent(input: AgentInput, userId: string) {
  const id = createId();
  await db.insert(agents).values({ ...input, id, userId });
  return getAgent(id);
}

export async function listAgents(userId: string) {
  return db.select().from(agents).where(eq(agents.userId, userId));
}

export async function listAgentsWithStats(userId: string) {
  const rows = await db
    .select({
      id: agents.id,
      name: agents.name,
      description: agents.description,
      avatar: agents.avatar,
      tags: agents.tags,
      systemPrompt: agents.systemPrompt,
      temperature: agents.temperature,
      maxTokens: agents.maxTokens,
      topP: agents.topP,
      model: agents.model,
      memoryWindowSize: agents.memoryWindowSize,
      toolsConfig: agents.toolsConfig,
      suggestedPrompts: agents.suggestedPrompts,
      userId: agents.userId,
      createdAt: agents.createdAt,
      updatedAt: agents.updatedAt,
      conversationCount: sql<number>`count(${conversations.id})`.mapWith(Number),
      lastActiveAt: sql<string | null>`max(${conversations.updatedAt})`,
    })
    .from(agents)
    .leftJoin(conversations, eq(conversations.agentId, agents.id))
    .where(eq(agents.userId, userId))
    .groupBy(agents.id);

  return rows;
}

export async function getAgent(id: string) {
  const [row] = await db.select().from(agents).where(eq(agents.id, id));
  return row ?? null;
}

/** 取出归属某用户的 agent，做权限隔离校验。找不到或非本人返回 null。 */
export async function getAgentOwnedBy(id: string, userId: string) {
  const [row] = await db.select().from(agents).where(and(eq(agents.id, id), eq(agents.userId, userId)));
  return row ?? null;
}

export async function updateAgent(id: string, input: AgentUpdateInput, userId: string) {
  const existing = await getAgentOwnedBy(id, userId);
  if (!existing) return null;
  await db
    .update(agents)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(agents.id, id));
  return getAgent(id);
}

export async function deleteAgent(id: string, userId: string) {
  const existing = await getAgentOwnedBy(id, userId);
  if (!existing) return false;
  await db.delete(agents).where(eq(agents.id, id));
  return true;
}
