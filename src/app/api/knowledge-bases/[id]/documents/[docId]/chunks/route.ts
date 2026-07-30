import { apiOk, apiError } from "@/lib/api-response";
import { getKnowledgeBaseOwnedBy } from "@/server/knowledge-bases";
import { getKnowledgeDocument } from "@/server/knowledge-documents";
import { listChunksByDocument } from "@/server/knowledge-chunks";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string; docId: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id, docId } = await params;
  const kb = await getKnowledgeBaseOwnedBy(id, user.id);
  if (!kb) return apiError(404, "not_found", "Knowledge base not found");
  const doc = await getKnowledgeDocument(docId);
  if (!doc || doc.knowledgeBaseId !== id) return apiError(404, "not_found", "Document not found");

  const chunks = await listChunksByDocument(docId);
  return apiOk(chunks);
}
