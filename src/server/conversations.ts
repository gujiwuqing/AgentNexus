import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { conversations } from "@/db/schema";
import { createId } from "@/lib/id";

export async function createConversation(agentId: string, title = "New conversation") {
  const id = createId();
  await db.insert(conversations).values({ id, agentId, title });
  return getConversationById(id);
}

export async function listConversationsForAgent(agentId: string) {
  return db
    .select()
    .from(conversations)
    .where(eq(conversations.agentId, agentId))
    .orderBy(desc(conversations.createdAt));
}

export async function getConversationById(id: string) {
  const [row] = await db.select().from(conversations).where(eq(conversations.id, id));
  return row ?? null;
}

export async function updateConversationTitle(id: string, title: string) {
  const existing = await getConversationById(id);
  if (!existing) return null;
  await db
    .update(conversations)
    .set({ title, updatedAt: new Date() })
    .where(eq(conversations.id, id));
  return getConversationById(id);
}

export async function deleteConversation(id: string) {
  const existing = await getConversationById(id);
  if (!existing) return false;
  await db.delete(conversations).where(eq(conversations.id, id));
  return true;
}
