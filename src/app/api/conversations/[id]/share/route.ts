import { apiOk, apiError } from "@/lib/api-response";
import { getConversationById } from "@/server/conversations";
import { createOrRenewShare, revokeShare } from "@/server/conversation-shares";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  const conversation = await getConversationById(id);
  if (!conversation) return apiError(404, "not_found", "Conversation not found");
  const share = await createOrRenewShare(id);
  return apiOk({ token: share.token });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const conversation = await getConversationById(id);
  if (!conversation) return apiError(404, "not_found", "Conversation not found");
  const revoked = await revokeShare(id);
  if (!revoked) return apiError(404, "not_found", "No active share found");
  return apiOk({ success: true });
}
