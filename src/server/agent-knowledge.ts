import { eq } from "drizzle-orm";
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

export async function setAgentKnowledgeBases(agentId: string, knowledgeBaseIds: string[]) {
  await db.delete(agentKnowledgeBases).where(eq(agentKnowledgeBases.agentId, agentId));
  if (knowledgeBaseIds.length > 0) {
    await db.insert(agentKnowledgeBases).values(
      knowledgeBaseIds.map((kbId) => ({ agentId, knowledgeBaseId: kbId })),
    );
  }
}
