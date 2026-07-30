import { apiOk, apiError } from "@/lib/api-response";
import { getKnowledgeBaseOwnedBy } from "@/server/knowledge-bases";
import { listDocuments } from "@/server/knowledge-documents";
import { indexDocument } from "@/lib/knowledge/indexer";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

/** 重新索引该知识库下的全部文档（分片策略变更后需要重跑）。 */
export async function POST(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const kb = await getKnowledgeBaseOwnedBy(id, user.id);
  if (!kb) return apiError(404, "not_found", "Knowledge base not found");

  const docs = await listDocuments(id);

  // 顺序执行避免同时打满 embedding 接口；不阻塞响应，前端靠轮询看状态。
  void (async () => {
    for (const doc of docs) {
      try {
        await indexDocument(doc.id);
      } catch (err) {
        console.error(`Reindex failed for document ${doc.id}:`, err);
      }
    }
  })();

  return apiOk({ success: true, count: docs.length });
}
