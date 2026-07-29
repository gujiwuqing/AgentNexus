import { apiOk, apiError } from "@/lib/api-response";
import { getConversationOwnedBy } from "@/server/conversations";
import { createOrRenewShare, revokeShare } from "@/server/conversation-shares";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const conversation = await getConversationOwnedBy(id, user.id);
  if (!conversation) return apiError(404, "not_found", "Conversation not found");
  const share = await createOrRenewShare(id);
  return apiOk({ token: share.token });
}

export async function DELETE(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const conversation = await getConversationOwnedBy(id, user.id);
  if (!conversation) return apiError(404, "not_found", "Conversation not found");
  const revoked = await revokeShare(id);
  if (!revoked) return apiError(404, "not_found", "No active share found");
  return apiOk({ success: true });
}
