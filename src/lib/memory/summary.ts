import { generateText } from "ai";
import type { ProviderConfig } from "@/lib/ai/provider";
import { createModelClient } from "@/lib/ai/provider-factory";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

type MessageForSummary = {
  id: string;
  role: string;
  content: string;
};

function buildSummaryPrompt(existingSummary: string | null, newMessages: MessageForSummary[]): string {
  const messagesText = newMessages
    .map((m) => `${m.role}: ${m.content.slice(0, 2000)}`)
    .join("\n\n");

  return [
    "你是一个对话摘要助手。请将以下对话历史压缩为简洁的摘要，保留关键信息：",
    "- 用户的核心需求和意图",
    "- 重要的决策和结论",
    "- 关键的数据和事实",
    "- 待办事项和未完成的工作",
    "",
    existingSummary ? `已有的历史摘要：\n${existingSummary}\n` : "",
    "需要压缩的新对话内容：",
    messagesText,
    "",
    "请输出更新后的完整摘要（保持简洁，不超过 500 字）：",
  ].filter(Boolean).join("\n");
}

export async function updateConversationSummary(
  conversationId: string,
  windowSize: number,
  provider: ProviderConfig,
): Promise<void> {
  const [conversation] = await db
    .select({ summary: conversations.summary, summaryUpTo: conversations.summaryUpTo })
    .from(conversations)
    .where(eq(conversations.id, conversationId));

  if (!conversation) return;

  const allMessages = await db
    .select({ id: messages.id, role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  if (allMessages.length <= windowSize) return;

  const cutoffIndex = allMessages.length - windowSize;

  let startIndex = 0;
  if (conversation.summaryUpTo) {
    const idx = allMessages.findIndex((m) => m.id === conversation.summaryUpTo);
    if (idx >= 0) startIndex = idx + 1;
  }

  const newMessagesToCompress = allMessages.slice(startIndex, cutoffIndex);
  if (newMessagesToCompress.length < 4) return;

  const prompt = buildSummaryPrompt(conversation.summary, newMessagesToCompress);

  try {
    const result = await generateText({
      model: createModelClient(provider),
      messages: [{ role: "user", content: prompt }],
      maxTokens: 1000,
      temperature: 0.3,
    });

    const newSummary = result.text.trim();
    if (newSummary) {
      const lastCompressedId = newMessagesToCompress[newMessagesToCompress.length - 1].id;
      await db
        .update(conversations)
        .set({ summary: newSummary, summaryUpTo: lastCompressedId, updatedAt: new Date() })
        .where(eq(conversations.id, conversationId));
    }
  } catch (err) {
    console.error("[memory] Summary generation failed:", err instanceof Error ? err.message : err);
  }
}

export function buildSummarySystemMessage(summary: string): string {
  return `以下是之前对话的摘要，请在回复时参考这些上下文：\n\n${summary}`;
}
