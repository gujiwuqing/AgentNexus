import { eq } from "drizzle-orm";
import { db } from "@/db";
import { knowledgeBases } from "@/db/schema";
import { createId } from "@/lib/id";
import type { KnowledgeBaseInput, KnowledgeBaseUpdateInput } from "@/lib/validation/knowledge";

export async function listKnowledgeBases() {
  return db.select().from(knowledgeBases);
}

export async function getKnowledgeBase(id: string) {
  const [row] = await db.select().from(knowledgeBases).where(eq(knowledgeBases.id, id));
  return row ?? null;
}

export async function createKnowledgeBase(input: KnowledgeBaseInput) {
  const id = createId();
  await db.insert(knowledgeBases).values({ id, ...input });
  return getKnowledgeBase(id);
}

export async function updateKnowledgeBase(id: string, input: KnowledgeBaseUpdateInput) {
  const existing = await getKnowledgeBase(id);
  if (!existing) return null;
  await db.update(knowledgeBases).set({ ...input, updatedAt: new Date() }).where(eq(knowledgeBases.id, id));
  return getKnowledgeBase(id);
}

export async function deleteKnowledgeBase(id: string) {
  const existing = await getKnowledgeBase(id);
  if (!existing) return false;
  await db.delete(knowledgeBases).where(eq(knowledgeBases.id, id));
  return true;
}
