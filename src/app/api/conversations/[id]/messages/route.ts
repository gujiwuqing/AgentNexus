import { getConversationById, updateConversationTitle, getConversationOwnedBy } from "@/server/conversations";
import { getAgent } from "@/server/agents";
import { listMessages, appendUserMessage, appendAssistantMessage } from "@/server/messages";
import { getProviderConfig } from "@/server/provider-config";
import { resolveProviderConfig, MissingProviderConfigError } from "@/lib/ai/provider";
import { streamAgentReply, type ChatMessage } from "@/lib/ai/chat";
import { apiError } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { resolveAgentTools } from "@/lib/tools/resolve";
import { retrieveAgentRagContext } from "@/lib/knowledge/agent-rag";
import { getAttachmentsByIds, linkAttachmentToMessage } from "@/server/attachments";
import { readStoredFile } from "@/lib/files/storage";
import { extractText, isImageFile } from "@/lib/files/extractor";
import { getTeamMembers, callTeamMember } from "@/server/agent-team";
import { buildDelegationTool } from "@/lib/tools/team-delegation";
import { getToolByName } from "@/lib/tools/registry";
import { getAgentSkills } from "@/server/agent-skills";
import { getAgentCustomTools } from "@/server/agent-custom-tools";
import { buildSkillSystemPrompt } from "@/lib/skills/prompt-builder";
import { updateConversationSummary, buildSummarySystemMessage } from "@/lib/memory/summary";
import { createTrace } from "@/server/message-traces";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const conversation = await getConversationOwnedBy(id, user.id);
  if (!conversation) return apiError(404, "not_found", "Conversation not found");

  const agent = await getAgent(conversation.agentId);
  if (!agent) return apiError(404, "not_found", "Agent not found");

  const body = await request.json().catch(() => ({}));
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content) return apiError(400, "validation_error", "content is required");
  const modelOverride = typeof body?.modelOverride === "string" ? body.modelOverride.trim() || null : null;

  const globalConfig = await getProviderConfig(user.id);
  let providerConfig;
  try {
    providerConfig = resolveProviderConfig(modelOverride || agent.model, globalConfig);
  } catch (err) {
    if (err instanceof MissingProviderConfigError) {
      return apiError(424, "provider_not_configured", err.message);
    }
    throw err;
  }

  const attachmentIds: string[] = Array.isArray(body?.attachmentIds) ? body.attachmentIds : [];
  const fileAttachments = await getAttachmentsByIds(attachmentIds.slice(0, 5));

  let enrichedContent = content;
  const imageContents: Array<{ type: "image"; image: string }> = [];

  for (const att of fileAttachments) {
    const buffer = await readStoredFile(att.storagePath);
    if (isImageFile(att.mimetype)) {
      imageContents.push({ type: "image", image: buffer.toString("base64") });
    } else {
      const text = await extractText(buffer, att.mimetype, att.filename);
      if (text.trim()) {
        enrichedContent += `\n\n--- 附件: ${att.filename} ---\n${text.slice(0, 50000)}\n--- 附件结束 ---`;
      }
    }
  }

  const attachmentSummary = fileAttachments.map((a) => ({
    id: a.id, filename: a.filename, mimetype: a.mimetype, size: a.size,
  }));

  const userMsg = await appendUserMessage(id, content, attachmentSummary.length > 0 ? attachmentSummary : null);

  if (userMsg) {
    for (const att of fileAttachments) {
      await linkAttachmentToMessage(att.id, userMsg.id);
    }
  }

  if (conversation.title === "New conversation") {
    const autoTitle = content.length > 30 ? content.slice(0, 30) + "..." : content;
    await updateConversationTitle(id, user.id, autoTitle);
  }

  const history = await listMessages(id);
  const windowSize = agent.memoryWindowSize ?? 20;
  const trimmedHistory = windowSize > 0 ? history.slice(-windowSize) : history;
  const chatMessages: ChatMessage[] = [
    ...(agent.systemPrompt ? [{ role: "system" as const, content: agent.systemPrompt }] : []),
    ...trimmedHistory.map((m) => ({ role: m.role, content: m.content })),
  ];

  // Summary + Window 策略：注入对话摘要
  if (agent.memoryStrategy === "summary_window" && conversation.summary) {
    const summaryMsg = { role: "system" as const, content: buildSummarySystemMessage(conversation.summary) };
    if (chatMessages.length > 0 && chatMessages[0].role === "system") {
      chatMessages.splice(1, 0, summaryMsg);
    } else {
      chatMessages.unshift(summaryMsg);
    }
  }

  if (imageContents.length > 0) {
    const lastIdx = chatMessages.length - 1;
    chatMessages[lastIdx] = {
      role: "user",
      content: [
        { type: "text", text: enrichedContent },
        ...imageContents,
      ],
    } as ChatMessage;
  } else if (enrichedContent !== content) {
    chatMessages[chatMessages.length - 1] = { role: "user", content: enrichedContent };
  }

  // 注入关联的 Skills 到 system prompt
  const agentSkillRows = await getAgentSkills(agent.id);
  if (agentSkillRows.length > 0) {
    const skillPrompt = buildSkillSystemPrompt(agentSkillRows);
    if (chatMessages.length > 0 && chatMessages[0].role === "system") {
      chatMessages[0] = {
        role: "system",
        content: (chatMessages[0].content as string) + skillPrompt,
      };
    } else {
      chatMessages.unshift({ role: "system", content: skillPrompt });
    }
  }

  const ragTopK = (agent.toolsConfig as { ragTopK?: number })?.ragTopK ?? 5;
  const ragContext = await retrieveAgentRagContext(agent.id, content, globalConfig, ragTopK);
  if (ragContext) {
    if (chatMessages.length > 0 && chatMessages[0].role === "system") {
      chatMessages[0] = {
        role: "system",
        content: (chatMessages[0].content as string) + ragContext,
      };
    } else {
      chatMessages.unshift({ role: "system", content: ragContext });
    }
  }

  const enabledTools = (agent.toolsConfig as { enabledTools?: string[] })?.enabledTools ?? [];
  const searchConfig = globalConfig?.webSearchProvider && globalConfig?.webSearchApiKey
    ? { provider: globalConfig.webSearchProvider, apiKey: globalConfig.webSearchApiKey }
    : null;
  const teamMembers = await getTeamMembers(agent.id);
  const teamToolDefs = teamMembers.map((m) =>
    buildDelegationTool(
      { memberAgentId: m.memberAgentId, memberAgentName: m.memberAgentName, roleDescription: m.roleDescription },
      // 将主 Agent 作为委托链起点传入，防止成员反向委托回主 Agent 成环
      (memberAgentId, task) => callTeamMember(memberAgentId, task, { depth: 1, chain: [agent.id] }),
    )
  );
  const agentCustomToolRows = await getAgentCustomTools(agent.id);
  const tools = resolveAgentTools(enabledTools, searchConfig, agentCustomToolRows, teamToolDefs);

  const startedAt = Date.now();
  const result = streamAgentReply(
    providerConfig,
    chatMessages,
    { temperature: agent.temperature, maxTokens: agent.maxTokens, topP: agent.topP },
    tools,
    async (meta) => {
      const durationMs = Date.now() - startedAt;
      const enrichedToolCalls = meta.toolCalls.map((tc) => {
        if (tc.toolName.startsWith("delegate_to_")) {
          const memberId = tc.toolName.replace("delegate_to_", "");
          const member = teamMembers.find((m) => m.memberAgentId === memberId);
          return { ...tc, displayName: member?.memberAgentName ?? tc.toolName };
        }
        const customTool = agentCustomToolRows.find((ct) => ct.name === tc.toolName);
        if (customTool) {
          return { ...tc, displayName: customTool.displayName };
        }
        const builtin = getToolByName(tc.toolName);
        return { ...tc, displayName: builtin?.displayName ?? tc.toolName };
      });
      const activeSkills = agentSkillRows.length > 0
        ? agentSkillRows.map((s) => ({ name: s.name, icon: s.icon || "⚡" }))
        : null;
      const savedMsg = await appendAssistantMessage(id, meta.text, {
        model: providerConfig.model,
        promptTokens: meta.usage?.promptTokens,
        completionTokens: meta.usage?.completionTokens,
        totalTokens: meta.usage?.totalTokens,
        durationMs,
        toolCalls: enrichedToolCalls.length > 0 ? enrichedToolCalls : null,
        activeSkills,
      });

      // 保存调试 trace
      if (savedMsg) {
        const traceSystemPrompt = chatMessages.find(m => m.role === "system")?.content as string | undefined;
        createTrace({
          messageId: savedMsg.id,
          systemPrompt: traceSystemPrompt,
          skillsInjected: activeSkills ?? undefined,
          toolsAvailable: tools ? Object.keys(tools) : undefined,
          ragContext: ragContext ?? undefined,
          summaryUsed: (agent.memoryStrategy === "summary_window" && conversation.summary) ? conversation.summary : undefined,
          modelUsed: providerConfig.model,
          tokenDetails: meta.usage ? { input: meta.usage.promptTokens, output: meta.usage.completionTokens, total: meta.usage.totalTokens } : undefined,
          latencyMs: durationMs,
        }).catch((err) => console.error("[trace] save failed:", err));
      }

      // 异步触发摘要更新
      if (agent.memoryStrategy === "summary_window") {
        const totalCount = history.length + 2;
        if (totalCount > (agent.memoryWindowSize ?? 20) + 4) {
          updateConversationSummary(id, agent.memoryWindowSize ?? 20, providerConfig)
            .catch((err) => console.error("[memory] async summary failed:", err));
        }
      }
    }
  );

  return result.toDataStreamResponse();
}
