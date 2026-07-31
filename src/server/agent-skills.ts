import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agentSkills, skills } from "@/db/schema";

export async function getAgentSkillIds(agentId: string): Promise<string[]> {
  const rows = await db
    .select({ skillId: agentSkills.skillId })
    .from(agentSkills)
    .where(eq(agentSkills.agentId, agentId));
  return rows.map((r) => r.skillId);
}

export async function getAgentSkills(agentId: string) {
  const rows = await db
    .select({
      id: skills.id,
      name: skills.name,
      description: skills.description,
      icon: skills.icon,
      category: skills.category,
      content: skills.content,
      resources: skills.resources,
      allowedTools: skills.allowedTools,
    })
    .from(agentSkills)
    .innerJoin(skills, eq(agentSkills.skillId, skills.id))
    .where(eq(agentSkills.agentId, agentId));
  return rows;
}

export async function setAgentSkills(agentId: string, skillIds: string[], userId: string) {
  await db.delete(agentSkills).where(eq(agentSkills.agentId, agentId));
  if (skillIds.length > 0) {
    const owned = await db
      .select({ id: skills.id })
      .from(skills)
      .where(eq(skills.userId, userId));
    const ownedIds = new Set(owned.map((r) => r.id));
    const valid = skillIds.filter((id) => ownedIds.has(id));
    if (valid.length > 0) {
      await db.insert(agentSkills).values(
        valid.map((skillId) => ({ agentId, skillId })),
      );
    }
  }
}
