import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { knowledgeBases } from "@/db/schema";
import { createId } from "@/lib/id";
import type { KnowledgeBaseInput, KnowledgeBaseUpdateInput } from "@/lib/validation/knowledge";

export async function createKnowledgeBase(input: KnowledgeBaseInput, userId: string) {
  const id = createId();
  await db.insert(knowledgeBases).values({ id, userId, ...input });
  return getKnowledgeBase(id);
}

export async function listKnowledgeBases(userId: string) {
  return db.select().from(knowledgeBases).where(eq(knowledgeBases.userId, userId));
}

export async function getKnowledgeBase(id: string) {
  const [row] = await db.select().from(knowledgeBases).where(eq(knowledgeBases.id, id));
  return row ?? null;
}

/** 取出归属某用户的知识库，做权限隔离校验。 */
export async function getKnowledgeBaseOwnedBy(id: string, userId: string) {
  const [row] = await db.select().from(knowledgeBases).where(and(eq(knowledgeBases.id, id), eq(knowledgeBases.userId, userId)));
  return row ?? null;
}

export async function updateKnowledgeBase(id: string, input: KnowledgeBaseUpdateInput, userId: string) {
  const existing = await getKnowledgeBaseOwnedBy(id, userId);
  if (!existing) return null;
  await db.update(knowledgeBases).set({ ...input, updatedAt: new Date() }).where(eq(knowledgeBases.id, id));
  return getKnowledgeBase(id);
}

export async function deleteKnowledgeBase(id: string, userId: string) {
  const existing = await getKnowledgeBaseOwnedBy(id, userId);
  if (!existing) return false;
  await db.delete(knowledgeBases).where(eq(knowledgeBases.id, id));
  return true;
}
