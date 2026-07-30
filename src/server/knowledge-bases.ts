import { eq, and, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { knowledgeBases, knowledgeDocuments } from "@/db/schema";
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

/**
 * 列表页专用：附带文档/分片/异常统计。
 * 用一次按 knowledgeBaseId 的聚合查询后在应用层合并，避免每个知识库单独查一次（N+1）。
 */
export async function listKnowledgeBasesWithStats(userId: string) {
  const bases = await listKnowledgeBases(userId);
  if (bases.length === 0) return [];

  const rows = await db
    .select({
      knowledgeBaseId: knowledgeDocuments.knowledgeBaseId,
      documentCount: sql<number>`count(*)`,
      chunkCount: sql<number>`coalesce(sum(${knowledgeDocuments.chunkCount}), 0)`,
      failedCount: sql<number>`sum(case when ${knowledgeDocuments.status} = 'failed' then 1 else 0 end)`,
      indexingCount: sql<number>`sum(case when ${knowledgeDocuments.status} in ('pending', 'processing') then 1 else 0 end)`,
    })
    .from(knowledgeDocuments)
    .where(inArray(knowledgeDocuments.knowledgeBaseId, bases.map((b) => b.id)))
    .groupBy(knowledgeDocuments.knowledgeBaseId);

  const statsById = new Map(
    rows.map((r) => [
      r.knowledgeBaseId,
      {
        documentCount: Number(r.documentCount),
        chunkCount: Number(r.chunkCount),
        failedCount: Number(r.failedCount),
        indexingCount: Number(r.indexingCount),
      },
    ]),
  );

  return bases.map((base) => ({
    ...base,
    stats: statsById.get(base.id) ?? {
      documentCount: 0,
      chunkCount: 0,
      failedCount: 0,
      indexingCount: 0,
    },
  }));
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
