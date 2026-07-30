import { apiError, apiOk } from "@/lib/api-response";
import { getKnowledgeBaseOwnedBy } from "@/server/knowledge-bases";
import { getProviderConfig } from "@/server/provider-config";
import { getChunksWithFilenameByKnowledgeBaseId } from "@/server/knowledge-chunks";
import { embedSingle } from "@/lib/ai/embedding";
import { retrieveHybrid } from "@/lib/knowledge/retriever";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const kb = await getKnowledgeBaseOwnedBy(id, user.id);
  if (!kb) return apiError(404, "not_found", "Knowledge base not found");

  const body = await request.json().catch(() => ({}));
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (!query) return apiError(400, "validation_error", "query is required");
  const topK = Number.isFinite(body?.topK) ? Math.min(Math.max(1, body.topK), 20) : 5;

  const globalConfig = await getProviderConfig(user.id);
  if (!globalConfig?.embeddingModel) {
    return apiError(424, "embedding_not_configured", "No embedding model configured in Settings");
  }

  const chunks = await getChunksWithFilenameByKnowledgeBaseId(id);
  if (chunks.length === 0) {
    return apiOk({ results: [] });
  }

  const queryEmbedding = await embedSingle(
    globalConfig.baseUrl,
    globalConfig.apiKey,
    globalConfig.embeddingModel,
    query,
  );

  const results = retrieveHybrid(queryEmbedding, query, chunks, topK);

  return apiOk({ results });
}
