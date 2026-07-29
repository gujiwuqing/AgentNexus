import { apiOk, apiError } from "@/lib/api-response";
import { getKnowledgeBaseOwnedBy } from "@/server/knowledge-bases";
import { getKnowledgeDocument } from "@/server/knowledge-documents";
import { indexDocument } from "@/lib/knowledge/indexer";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string; docId: string }> };

export async function POST(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id, docId } = await params;
  const kb = await getKnowledgeBaseOwnedBy(id, user.id);
  if (!kb) return apiError(404, "not_found", "Knowledge base not found");
  const doc = await getKnowledgeDocument(docId);
  if (!doc) return apiError(404, "not_found", "Document not found");
  indexDocument(docId).catch(console.error);
  return apiOk({ success: true, message: "Reindexing started" });
}
