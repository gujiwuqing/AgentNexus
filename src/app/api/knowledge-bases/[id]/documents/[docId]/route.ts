import { apiOk, apiError } from "@/lib/api-response";
import { deleteKnowledgeDocument } from "@/server/knowledge-documents";
import { deleteStoredFile } from "@/lib/files/storage";

type Params = { params: Promise<{ id: string; docId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const { docId } = await params;
  const deleted = await deleteKnowledgeDocument(docId);
  if (!deleted) return apiError(404, "not_found", "Document not found");
  await deleteStoredFile(deleted.storagePath).catch(() => {});
  return apiOk({ success: true });
}
