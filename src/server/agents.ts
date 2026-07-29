import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { agents, conversations } from "@/db/schema";
import { createId } from "@/lib/id";
import type { AgentInput, AgentUpdateInput } from "@/lib/validation/agent";

export async function createAgent(input: AgentInput) {
  const id = createId();
  await db.insert(agents).values({ ...input, id });
  return getAgent(id);
}

export async function listAgents() {
  return db.select().from(agents);
}

export async function listAgentsWithStats() {
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
      createdAt: agents.createdAt,
      updatedAt: agents.updatedAt,
      conversationCount: sql<number>`count(${conversations.id})`.mapWith(Number),
      lastActiveAt: sql<string | null>`max(${conversations.updatedAt})`,
    })
    .from(agents)
    .leftJoin(conversations, eq(conversations.agentId, agents.id))
    .groupBy(agents.id);

  return rows;
}

export async function getAgent(id: string) {
  const [row] = await db.select().from(agents).where(eq(agents.id, id));
  return row ?? null;
}

export async function updateAgent(id: string, input: AgentUpdateInput) {
  const existing = await getAgent(id);
  if (!existing) return null;
  await db
    .update(agents)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(agents.id, id));
  return getAgent(id);
}

export async function deleteAgent(id: string) {
  const existing = await getAgent(id);
  if (!existing) return false;
  await db.delete(agents).where(eq(agents.id, id));
  return true;
}
