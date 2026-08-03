import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agentTeamMembers, agents } from "@/db/schema";
import { createId } from "@/lib/id";

export type TeamMemberRow = {
  memberAgentId: string;
  memberAgentName: string;
  memberAgentAvatar: string;
  roleDescription: string;
};

export async function getTeamMembers(supervisorAgentId: string): Promise<TeamMemberRow[]> {
  const rows = await db
    .select({
      memberAgentId: agentTeamMembers.memberAgentId,
      memberAgentName: agents.name,
      memberAgentAvatar: agents.avatar,
      memberAgentDescription: agents.description,
      roleDescription: agentTeamMembers.roleDescription,
    })
    .from(agentTeamMembers)
    .innerJoin(agents, eq(agentTeamMembers.memberAgentId, agents.id))
    .where(eq(agentTeamMembers.supervisorAgentId, supervisorAgentId));

  return rows.map((r) => ({
    memberAgentId: r.memberAgentId,
    memberAgentName: r.memberAgentName,
    memberAgentAvatar: r.memberAgentAvatar,
    roleDescription: (r.roleDescription && r.roleDescription.trim() !== "")
      ? r.roleDescription
      : r.memberAgentDescription,
  }));
}

export async function setTeamMembers(
  supervisorAgentId: string,
  members: Array<{ memberAgentId: string; roleDescription?: string }>,
): Promise<void> {
  const filtered = members.filter((m) => m.memberAgentId !== supervisorAgentId);

  await db.delete(agentTeamMembers).where(eq(agentTeamMembers.supervisorAgentId, supervisorAgentId));

  if (filtered.length > 0) {
    await db.insert(agentTeamMembers).values(
      filtered.map((m) => ({
        id: createId(),
        supervisorAgentId,
        memberAgentId: m.memberAgentId,
        roleDescription: m.roleDescription ?? null,
      })),
    );
  }
}
