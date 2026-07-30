import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agentCustomTools, customTools } from "@/db/schema";

export async function getAgentCustomToolIds(agentId: string): Promise<string[]> {
  const rows = await db
    .select({ toolId: agentCustomTools.toolId })
    .from(agentCustomTools)
    .where(eq(agentCustomTools.agentId, agentId));
  return rows.map((r) => r.toolId);
}

export async function getAgentCustomTools(agentId: string) {
  const rows = await db
    .select()
    .from(agentCustomTools)
    .innerJoin(customTools, eq(agentCustomTools.toolId, customTools.id))
    .where(eq(agentCustomTools.agentId, agentId));
  return rows.map((r) => r.custom_tools);
}

export async function setAgentCustomTools(agentId: string, toolIds: string[], userId: string) {
  await db.delete(agentCustomTools).where(eq(agentCustomTools.agentId, agentId));
  if (toolIds.length > 0) {
    const owned = await db
      .select({ id: customTools.id })
      .from(customTools)
      .where(eq(customTools.userId, userId));
    const ownedIds = new Set(owned.map((r) => r.id));
    const valid = toolIds.filter((id) => ownedIds.has(id));
    if (valid.length > 0) {
      await db.insert(agentCustomTools).values(
        valid.map((toolId) => ({ agentId, toolId })),
      );
    }
  }
}
