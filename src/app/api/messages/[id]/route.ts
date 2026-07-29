import { deleteMessage } from "@/server/messages";
import { apiError } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const deleted = await deleteMessage(id);
  if (!deleted) return apiError(404, "not_found", "Message not found");
  return new Response(null, { status: 204 });
}
