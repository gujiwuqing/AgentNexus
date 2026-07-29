import { apiOk, apiError } from "@/lib/api-response";
import { getKnowledgeDocument } from "@/server/knowledge-documents";
import { indexDocument } from "@/lib/knowledge/indexer";

type Params = { params: Promise<{ id: string; docId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { docId } = await params;
  const doc = await getKnowledgeDocument(docId);
  if (!doc) return apiError(404, "not_found", "Document not found");
  indexDocument(docId).catch(console.error);
  return apiOk({ success: true, message: "Reindexing started" });
}
