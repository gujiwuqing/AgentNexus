import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { knowledgeChunks, knowledgeDocuments } from "@/db/schema";
import { createId } from "@/lib/id";

export async function insertChunks(
  documentId: string,
  chunks: Array<{ content: string; embedding: number[]; chunkIndex: number }>,
) {
  if (chunks.length === 0) return;
  const values = chunks.map((c) => ({
    id: createId(),
    documentId,
    content: c.content,
    embedding: c.embedding,
    chunkIndex: c.chunkIndex,
    metadata: {},
  }));
  await db.insert(knowledgeChunks).values(values);
}

export async function deleteChunksByDocument(documentId: string) {
  await db.delete(knowledgeChunks).where(eq(knowledgeChunks.documentId, documentId));
}

export async function getChunksByKnowledgeBaseIds(knowledgeBaseIds: string[]) {
  if (knowledgeBaseIds.length === 0) return [];

  const rows = await db
    .select({
      id: knowledgeChunks.id,
      content: knowledgeChunks.content,
      embedding: knowledgeChunks.embedding,
      documentId: knowledgeChunks.documentId,
    })
    .from(knowledgeChunks)
    .innerJoin(
      knowledgeDocuments,
      eq(knowledgeChunks.documentId, knowledgeDocuments.id),
    )
    .where(
      knowledgeBaseIds.length === 1
        ? eq(knowledgeDocuments.knowledgeBaseId, knowledgeBaseIds[0])
        : inArray(knowledgeDocuments.knowledgeBaseId, knowledgeBaseIds),
    );

  return rows;
}
