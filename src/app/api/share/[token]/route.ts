import { apiOk, apiError } from "@/lib/api-response";
import { getShareByToken } from "@/server/conversation-shares";
import { getConversationById } from "@/server/conversations";
import { listMessages } from "@/server/messages";
import { getAgent } from "@/server/agents";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;
  const share = await getShareByToken(token);
  if (!share) return apiError(404, "not_found", "Share not found");

  const conversation = await getConversationById(share.conversationId);
  if (!conversation) return apiError(404, "not_found", "Conversation not found");

  const agent = await getAgent(conversation.agentId);
  const messages = await listMessages(share.conversationId);

  return apiOk({
    conversation: {
      title: conversation.title,
      agentName: agent?.name ?? "Agent",
      agentAvatar: agent?.avatar ?? "",
    },
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
      attachments: (m as Record<string, unknown>).attachments ?? null,
    })),
  });
}
