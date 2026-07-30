import { eq, inArray, asc } from "drizzle-orm";
import { db } from "@/db";
import { knowledgeChunks, knowledgeDocuments } from "@/db/schema";
import { createId } from "@/lib/id";

export async function insertChunks(
  documentId: string,
  chunks: Array<{
    content: string;
    embedding: number[];
    chunkIndex: number;
    metadata?: Record<string, unknown>;
  }>,
) {
  if (chunks.length === 0) return;
  const values = chunks.map((c) => ({
    id: createId(),
    documentId,
    content: c.content,
    embedding: c.embedding,
    chunkIndex: c.chunkIndex,
    metadata: c.metadata ?? {},
  }));
  await db.insert(knowledgeChunks).values(values);
}

export async function deleteChunksByDocument(documentId: string) {
  await db.delete(knowledgeChunks).where(eq(knowledgeChunks.documentId, documentId));
}

/** 按分片顺序列出文档的全部分片（不含 embedding，供预览使用）。 */
export async function listChunksByDocument(documentId: string) {
  return db
    .select({
      id: knowledgeChunks.id,
      chunkIndex: knowledgeChunks.chunkIndex,
      content: knowledgeChunks.content,
      metadata: knowledgeChunks.metadata,
    })
    .from(knowledgeChunks)
    .where(eq(knowledgeChunks.documentId, documentId))
    .orderBy(asc(knowledgeChunks.chunkIndex));
}

export async function getChunksByKnowledgeBaseIds(knowledgeBaseIds: string[]) {
  if (knowledgeBaseIds.length === 0) return [];

  const rows = await db
    .select({
      id: knowledgeChunks.id,
      content: knowledgeChunks.content,
      embedding: knowledgeChunks.embedding,
      documentId: knowledgeChunks.documentId,
      metadata: knowledgeChunks.metadata,
      filename: knowledgeDocuments.filename,
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

export async function getChunksWithFilenameByKnowledgeBaseId(knowledgeBaseId: string) {
  const rows = await db
    .select({
      id: knowledgeChunks.id,
      content: knowledgeChunks.content,
      embedding: knowledgeChunks.embedding,
      documentId: knowledgeChunks.documentId,
      metadata: knowledgeChunks.metadata,
      filename: knowledgeDocuments.filename,
    })
    .from(knowledgeChunks)
    .innerJoin(
      knowledgeDocuments,
      eq(knowledgeChunks.documentId, knowledgeDocuments.id),
    )
    .where(eq(knowledgeDocuments.knowledgeBaseId, knowledgeBaseId));

  return rows;
}
