import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { agentKnowledgeBases, knowledgeBases } from "@/db/schema";

export async function getAgentKnowledgeBaseIds(agentId: string): Promise<string[]> {
  const rows = await db
    .select({ knowledgeBaseId: agentKnowledgeBases.knowledgeBaseId })
    .from(agentKnowledgeBases)
    .where(eq(agentKnowledgeBases.agentId, agentId));
  return rows.map((r) => r.knowledgeBaseId);
}

export async function getAgentKnowledgeBases(agentId: string) {
  const rows = await db
    .select({
      id: knowledgeBases.id,
      name: knowledgeBases.name,
      description: knowledgeBases.description,
    })
    .from(agentKnowledgeBases)
    .innerJoin(knowledgeBases, eq(agentKnowledgeBases.knowledgeBaseId, knowledgeBases.id))
    .where(eq(agentKnowledgeBases.agentId, agentId));
  return rows;
}

/**
 * 设置某 agent 关联的知识库。userId 用于校验传入的知识库确实归属该用户，避免越权关联别人的知识库。
 */
export async function setAgentKnowledgeBases(agentId: string, knowledgeBaseIds: string[], userId: string) {
  await db.delete(agentKnowledgeBases).where(eq(agentKnowledgeBases.agentId, agentId));
  if (knowledgeBaseIds.length > 0) {
    // 校验所有 kbId 都归属当前用户
    const owned = await db
      .select({ id: knowledgeBases.id })
      .from(knowledgeBases)
      .where(and(eq(knowledgeBases.userId, userId)));
    const ownedIds = new Set(owned.map((r) => r.id));
    const valid = knowledgeBaseIds.filter((id) => ownedIds.has(id));
    if (valid.length > 0) {
      await db.insert(agentKnowledgeBases).values(
        valid.map((kbId) => ({ agentId, knowledgeBaseId: kbId })),
      );
    }
  }
}
