import { apiOk, apiError } from "@/lib/api-response";
import { knowledgeBaseUpdateSchema } from "@/lib/validation/knowledge";
import { getKnowledgeBaseOwnedBy, updateKnowledgeBase, deleteKnowledgeBase } from "@/server/knowledge-bases";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const kb = await getKnowledgeBaseOwnedBy(id, user.id);
  if (!kb) return apiError(404, "not_found", "Knowledge base not found");
  return apiOk(kb);
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const body = await request.json();
  const parsed = knowledgeBaseUpdateSchema.safeParse(body);
  if (!parsed.success) return apiError(400, "validation_error", parsed.error.issues[0]?.message ?? "Invalid input");
  const kb = await updateKnowledgeBase(id, parsed.data, user.id);
  if (!kb) return apiError(404, "not_found", "Knowledge base not found");
  return apiOk(kb);
}

export async function DELETE(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const deleted = await deleteKnowledgeBase(id, user.id);
  if (!deleted) return apiError(404, "not_found", "Knowledge base not found");
  return apiOk({ success: true });
}
