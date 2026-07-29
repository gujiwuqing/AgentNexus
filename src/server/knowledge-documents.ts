import { eq } from "drizzle-orm";
import { db } from "@/db";
import { knowledgeDocuments } from "@/db/schema";
import { createId } from "@/lib/id";

export async function listDocuments(knowledgeBaseId: string) {
  return db.select().from(knowledgeDocuments).where(eq(knowledgeDocuments.knowledgeBaseId, knowledgeBaseId));
}

export async function getKnowledgeDocument(id: string) {
  const [row] = await db.select().from(knowledgeDocuments).where(eq(knowledgeDocuments.id, id));
  return row ?? null;
}

export async function createKnowledgeDocument(input: {
  knowledgeBaseId: string;
  filename: string;
  mimetype: string;
  size: number;
  storagePath: string;
}) {
  const id = createId();
  await db.insert(knowledgeDocuments).values({ id, ...input, status: "pending" });
  return getKnowledgeDocument(id);
}

export async function updateDocumentStatus(
  id: string,
  status: "processing" | "completed" | "failed",
  chunkCount?: number,
  error?: string,
) {
  await db
    .update(knowledgeDocuments)
    .set({
      status,
      ...(chunkCount !== undefined ? { chunkCount } : {}),
      ...(error !== undefined ? { error } : {}),
      updatedAt: new Date(),
    })
    .where(eq(knowledgeDocuments.id, id));
}

export async function deleteKnowledgeDocument(id: string) {
  const existing = await getKnowledgeDocument(id);
  if (!existing) return null;
  await db.delete(knowledgeDocuments).where(eq(knowledgeDocuments.id, id));
  return existing;
}
