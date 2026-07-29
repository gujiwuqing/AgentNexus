import { z } from "zod";
import type { ToolDefinition } from "./types";

export type TeamMember = {
  memberAgentId: string;
  memberAgentName: string;
  roleDescription: string;
};

export function buildDelegationTool(
  member: TeamMember,
  callAgent: (agentId: string, task: string) => Promise<string>,
): ToolDefinition {
  return {
    name: `delegate_to_${member.memberAgentId}`,
    displayName: member.memberAgentName,
    description: `Delegate a task to "${member.memberAgentName}". ${member.roleDescription}`,
    parameters: z.object({
      task: z.string().describe("The specific task or question to send to this agent"),
    }),
    execute: async (params) => {
      try {
        return await callAgent(member.memberAgentId, params.task as string);
      } catch (err) {
        return JSON.stringify({ error: err instanceof Error ? err.message : "Delegation failed" });
      }
    },
  };
}
