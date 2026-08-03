import type { CoreTool } from "ai";
import { getAgent } from "./agents";
import { getProviderConfig } from "./provider-config";
import { getAgentSkills } from "./agent-skills";
import { getAgentCustomTools } from "./agent-custom-tools";
import { getTeamMembers, type TeamMemberRow } from "./agent-team";
import { resolveProviderConfig, type ProviderConfig } from "@/lib/ai/provider";
import { resolveAgentTools } from "@/lib/tools/resolve";
import { buildDelegationTool } from "@/lib/tools/team-delegation";
import { retrieveAgentRagContext, injectRagContext } from "@/lib/knowledge/agent-rag";
import { generateAgentReply } from "@/lib/ai/generate";
import { DEFAULT_MAX_STEPS, MAX_ALLOWED_STEPS, type ChatMessage, type ChatOptions } from "@/lib/ai/chat";

/** 委托链最大层数：主 Agent 算第 0 层，成员可再向下委托到该深度为止。 */
export const MAX_DELEGATION_DEPTH = 2;
export const DEFAULT_RAG_TOP_K = 5;

type LoadedAgent = NonNullable<Awaited<ReturnType<typeof getAgent>>>;
type GlobalConfig = Awaited<ReturnType<typeof getProviderConfig>>;

export type AgentToolsConfig = {
  enabledTools?: string[];
  ragTopK?: number;
  maxSteps?: number;
};

export function readToolsConfig(agent: Pick<LoadedAgent, "toolsConfig">): AgentToolsConfig {
  return (agent.toolsConfig ?? {}) as AgentToolsConfig;
}

export function resolveMaxSteps(agent: Pick<LoadedAgent, "toolsConfig">): number {
  const raw = readToolsConfig(agent).maxSteps;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return DEFAULT_MAX_STEPS;
  return Math.min(Math.max(Math.trunc(raw), 1), MAX_ALLOWED_STEPS);
}

export function resolveRagTopK(agent: Pick<LoadedAgent, "toolsConfig">): number {
  const raw = readToolsConfig(agent).ragTopK;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return DEFAULT_RAG_TOP_K;
  return Math.min(Math.max(Math.trunc(raw), 1), 50);
}

export type DelegationContext = {
  /** 当前委托深度，主 Agent 为 0 */
  depth: number;
  /** 本条委托链上已参与的 agentId，用于阻断 A→B→A 环 */
  chain: string[];
};

export type AgentToolset = {
  tools: Record<string, CoreTool> | undefined;
  skills: Awaited<ReturnType<typeof getAgentSkills>>;
  customTools: Awaited<ReturnType<typeof getAgentCustomTools>>;
  teamMembers: TeamMemberRow[];
};

/**
 * Agent 的完整工具面：内置工具白名单 + 自定义工具 + 团队委托工具 + Skill 元工具。
 *
 * 对话、团队委托、工作流 Agent 节点、评测这四个入口必须共用这一个函数。此前各入口
 * 各自拼装，工作流节点完全不传 tools、评测只传 skills，导致同一个 Agent 换个入口
 * 能力就被阉割一半——评测分数也就不代表线上行为。
 */
export async function assembleAgentToolset(
  agent: LoadedAgent,
  globalConfig: GlobalConfig,
  delegation: DelegationContext = { depth: 0, chain: [] },
): Promise<AgentToolset> {
  const enabledTools = readToolsConfig(agent).enabledTools ?? [];
  const searchConfig =
    globalConfig?.webSearchProvider && globalConfig?.webSearchApiKey
      ? { provider: globalConfig.webSearchProvider, apiKey: globalConfig.webSearchApiKey }
      : null;

  const [skills, customTools] = await Promise.all([
    getAgentSkills(agent.id),
    getAgentCustomTools(agent.id),
  ]);

  const chain = delegation.chain.includes(agent.id) ? delegation.chain : [...delegation.chain, agent.id];
  const teamMembers = delegation.depth < MAX_DELEGATION_DEPTH ? await getTeamMembers(agent.id) : [];
  const teamToolDefs = teamMembers
    .filter((m) => !chain.includes(m.memberAgentId))
    .map((m) =>
      buildDelegationTool(
        {
          memberAgentId: m.memberAgentId,
          memberAgentName: m.memberAgentName,
          roleDescription: m.roleDescription,
        },
        (memberAgentId, task) =>
          callTeamMember(memberAgentId, task, { depth: delegation.depth + 1, chain }),
      ),
    );

  const tools = resolveAgentTools(enabledTools, searchConfig, customTools, teamToolDefs, skills);
  return { tools, skills, customTools, teamMembers };
}

export type AgentRuntime = AgentToolset & {
  provider: ProviderConfig;
  messages: ChatMessage[];
  options: ChatOptions;
  maxSteps: number;
  ragContext: string;
};

/**
 * 单轮（非多轮对话）调用的完整装配：provider + system prompt + RAG + 全套工具。
 * 工作流 Agent 节点、评测、团队委托共用，保证与对话入口行为一致。
 */
export async function assembleAgentRuntime(params: {
  agent: LoadedAgent;
  prompt: string;
  /** 取 provider 配置用的用户；默认取 agent 所有者 */
  ownerUserId?: string;
  globalConfig?: GlobalConfig;
  delegation?: DelegationContext;
}): Promise<AgentRuntime> {
  const { agent, prompt } = params;
  const globalConfig =
    params.globalConfig ?? (await getProviderConfig(params.ownerUserId ?? agent.userId));
  const provider = resolveProviderConfig(agent.model, globalConfig);

  const ragContext = await retrieveAgentRagContext(
    agent.id,
    prompt,
    globalConfig,
    resolveRagTopK(agent),
  );
  const baseMessages: ChatMessage[] = [
    ...(agent.systemPrompt ? [{ role: "system" as const, content: agent.systemPrompt }] : []),
    { role: "user" as const, content: prompt },
  ];

  const toolset = await assembleAgentToolset(agent, globalConfig, params.delegation);

  return {
    ...toolset,
    provider,
    messages: injectRagContext(baseMessages, ragContext),
    options: { temperature: agent.temperature, maxTokens: agent.maxTokens, topP: agent.topP },
    maxSteps: resolveMaxSteps(agent),
    ragContext,
  };
}

/**
 * 执行一次团队委托。成员 Agent 带上自己的模型配置、知识库、工具与技能执行任务，
 * 并可继续向下委托——通过深度上限与调用链去环防止无限递归。
 */
export async function callTeamMember(
  memberAgentId: string,
  task: string,
  options?: Partial<DelegationContext>,
): Promise<string> {
  const depth = options?.depth ?? 1;
  const chain = options?.chain ?? [];

  if (chain.includes(memberAgentId)) {
    return `[delegation skipped] Agent ${memberAgentId} is already part of this delegation chain.`;
  }

  const agent = await getAgent(memberAgentId);
  if (!agent) throw new Error(`Team member agent ${memberAgentId} not found`);

  const runtime = await assembleAgentRuntime({
    agent,
    prompt: task,
    delegation: { depth, chain },
  });

  return generateAgentReply(
    runtime.provider,
    runtime.messages,
    runtime.options,
    runtime.tools,
    runtime.maxSteps,
  );
}
