import { getMessage, deleteMessage } from "@/server/messages";
import { getConversationOwnedBy } from "@/server/conversations";
import { apiError } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const msg = await getMessage(id);
  if (!msg) return apiError(404, "not_found", "Message not found");
  const conversation = await getConversationOwnedBy(msg.conversationId, user.id);
  if (!conversation) return apiError(404, "not_found", "Message not found");
  const deleted = await deleteMessage(id);
  if (!deleted) return apiError(404, "not_found", "Message not found");
  return new Response(null, { status: 204 });
}
