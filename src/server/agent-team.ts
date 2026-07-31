import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agentTeamMembers, agents } from "@/db/schema";
import { createId } from "@/lib/id";
import { getAgent } from "./agents";
import { getProviderConfig } from "./provider-config";
import { resolveProviderConfig } from "@/lib/ai/provider";
import { generateAgentReply } from "@/lib/ai/generate";
import { resolveAgentTools } from "@/lib/tools/resolve";
import { buildDelegationTool } from "@/lib/tools/team-delegation";
import { retrieveAgentRagContext, injectRagContext } from "@/lib/knowledge/agent-rag";
import { getAgentSkills } from "./agent-skills";
import { getAgentCustomTools } from "./agent-custom-tools";

/** 委托链最大层数：主 Agent 算第 0 层，成员可再向下委托到该深度为止。 */
export const MAX_DELEGATION_DEPTH = 2;

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

export type CallTeamMemberOptions = {
  /** 当前委托深度，主 Agent 发起时为 1 */
  depth?: number;
  /** 本条委托链上已参与的 agentId，用于阻断 A→B→A 环 */
  chain?: string[];
};

/**
 * 执行一次团队委托。成员 Agent 会带上自己的工具与知识库（RAG）执行任务，
 * 并可继续向下委托——通过深度上限与调用链去环防止无限递归。
 */
export async function callTeamMember(
  memberAgentId: string,
  task: string,
  options?: CallTeamMemberOptions,
): Promise<string> {
  const depth = options?.depth ?? 1;
  const chain = options?.chain ?? [];

  if (chain.includes(memberAgentId)) {
    return `[delegation skipped] Agent ${memberAgentId} is already part of this delegation chain.`;
  }

  const agent = await getAgent(memberAgentId);
  if (!agent) throw new Error(`Team member agent ${memberAgentId} not found`);

  const globalConfig = await getProviderConfig(agent.userId);
  const provider = resolveProviderConfig(agent.model, globalConfig);
  const nextChain = [...chain, memberAgentId];

  // 成员自己的知识库：不注入的话，配了知识库的专家 Agent 被委托时等于失去专业能力
  const ragContext = await retrieveAgentRagContext(agent.id, task, globalConfig);

  const memberSkills = await getAgentSkills(agent.id);

  const baseMessages = [
    ...(agent.systemPrompt ? [{ role: "system" as const, content: agent.systemPrompt }] : []),
    { role: "user" as const, content: task },
  ];
  const messages = injectRagContext(baseMessages, ragContext);

  // 成员自己的内置工具
  const enabledTools = (agent.toolsConfig as { enabledTools?: string[] })?.enabledTools ?? [];
  const searchConfig =
    globalConfig?.webSearchProvider && globalConfig?.webSearchApiKey
      ? { provider: globalConfig.webSearchProvider, apiKey: globalConfig.webSearchApiKey }
      : null;

  // 未达深度上限时，成员还能把子任务继续委托给它自己的团队成员
  const subMembers = depth < MAX_DELEGATION_DEPTH ? await getTeamMembers(agent.id) : [];
  const subToolDefs = subMembers
    .filter((m) => !nextChain.includes(m.memberAgentId))
    .map((m) =>
      buildDelegationTool(
        { memberAgentId: m.memberAgentId, memberAgentName: m.memberAgentName, roleDescription: m.roleDescription },
        (subAgentId, subTask) =>
          callTeamMember(subAgentId, subTask, { depth: depth + 1, chain: nextChain }),
      ),
    );

  const memberCustomTools = await getAgentCustomTools(agent.id);
  const tools = resolveAgentTools(enabledTools, searchConfig, memberCustomTools, subToolDefs, memberSkills);

  return generateAgentReply(
    provider,
    messages,
    {
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      topP: agent.topP,
    },
    tools,
  );
}
