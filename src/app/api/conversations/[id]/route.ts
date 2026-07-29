import { getConversationById, deleteConversation, updateConversationTitle } from "@/server/conversations";
import { listMessages } from "@/server/messages";
import { apiOk, apiError } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const conversation = await getConversationById(id);
  if (!conversation) return apiError(404, "not_found", "Conversation not found");
  const messages = await listMessages(id);
  return apiOk({ conversation, messages });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) return apiError(400, "validation_error", "title is required");
  const updated = await updateConversationTitle(id, title);
  if (!updated) return apiError(404, "not_found", "Conversation not found");
  return apiOk(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const deleted = await deleteConversation(id);
  if (!deleted) return apiError(404, "not_found", "Conversation not found");
  return new Response(null, { status: 204 });
}
