import { eq, desc, and } from "drizzle-orm";
import { db } from "@/db";
import { conversations, agents } from "@/db/schema";
import { createId } from "@/lib/id";

export async function createConversation(agentId: string, userId: string, title = "New conversation") {
  const id = createId();
  await db.insert(conversations).values({ id, agentId, userId, title });
  return getConversationById(id);
}

export async function listConversationsForAgent(agentId: string, userId: string) {
  return db
    .select()
    .from(conversations)
    .where(and(eq(conversations.agentId, agentId), eq(conversations.userId, userId)))
    .orderBy(desc(conversations.createdAt));
}

/** 列出用户的全部对话（跨 Agent），供全局搜索/命令面板使用。 */
export async function listConversationsForUser(userId: string, limit = 200) {
  return db
    .select({
      id: conversations.id,
      title: conversations.title,
      agentId: conversations.agentId,
      agentName: agents.name,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .innerJoin(agents, eq(conversations.agentId, agents.id))
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt))
    .limit(limit);
}

export async function getConversationById(id: string) {
  const [row] = await db.select().from(conversations).where(eq(conversations.id, id));
  return row ?? null;
}

/** 取出归属某用户的 conversation，做权限隔离校验。 */
export async function getConversationOwnedBy(id: string, userId: string) {
  const [row] = await db.select().from(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
  return row ?? null;
}

export async function updateConversationTitle(id: string, userId: string, title: string) {
  const existing = await getConversationOwnedBy(id, userId);
  if (!existing) return null;
  await db
    .update(conversations)
    .set({ title, updatedAt: new Date() })
    .where(eq(conversations.id, id));
  return getConversationById(id);
}

export async function deleteConversation(id: string, userId: string) {
  const existing = await getConversationOwnedBy(id, userId);
  if (!existing) return false;
  await db.delete(conversations).where(eq(conversations.id, id));
  return true;
}
