import { apiOk, apiError } from "@/lib/api-response";
import { getKnowledgeBaseOwnedBy } from "@/server/knowledge-bases";
import { deleteKnowledgeDocument } from "@/server/knowledge-documents";
import { deleteStoredFile } from "@/lib/files/storage";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string; docId: string }> };

export async function DELETE(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id, docId } = await params;
  const kb = await getKnowledgeBaseOwnedBy(id, user.id);
  if (!kb) return apiError(404, "not_found", "Knowledge base not found");
  const deleted = await deleteKnowledgeDocument(docId);
  if (!deleted) return apiError(404, "not_found", "Document not found");
  await deleteStoredFile(deleted.storagePath).catch(() => {});
  return apiOk({ success: true });
}
