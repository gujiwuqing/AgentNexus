import { apiOk, apiError } from "@/lib/api-response";
import { getConversationOwnedBy } from "@/server/conversations";
import { deleteMessagesAfter } from "@/server/messages";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const conversation = await getConversationOwnedBy(id, user.id);
  if (!conversation) return apiError(404, "not_found", "Conversation not found");

  const body = await request.json().catch(() => ({}));
  const afterMessageId = body?.afterMessageId;
  if (!afterMessageId || typeof afterMessageId !== "string") {
    return apiError(400, "validation_error", "afterMessageId is required");
  }

  const deleted = await deleteMessagesAfter(id, afterMessageId);
  return apiOk({ deleted, conversationId: id });
}
