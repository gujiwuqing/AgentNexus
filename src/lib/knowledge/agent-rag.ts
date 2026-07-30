import { getAgentKnowledgeBaseIds } from "@/server/agent-knowledge";
import { getChunksByKnowledgeBaseIds } from "@/server/knowledge-chunks";
import { embedSingle } from "@/lib/ai/embedding";
import { retrieveHybrid, buildRagContext } from "./retriever";

type EmbeddingConfig = {
  baseUrl: string;
  apiKey: string;
  embeddingModel: string | null;
};

/**
 * 取出某 Agent 关联知识库中与 query 最相关的内容，拼成可注入 system prompt 的上下文。
 * 未关联知识库、未配置 embedding 模型或检索失败时返回空串——RAG 是增强项，不应阻断对话。
 */
export async function retrieveAgentRagContext(
  agentId: string,
  query: string,
  config: EmbeddingConfig | null | undefined,
  topK = 5,
): Promise<string> {
  if (!config?.embeddingModel) return "";

  const kbIds = await getAgentKnowledgeBaseIds(agentId);
  if (kbIds.length === 0) return "";

  try {
    const queryEmbedding = await embedSingle(
      config.baseUrl,
      config.apiKey,
      config.embeddingModel,
      query,
    );
    const chunks = await getChunksByKnowledgeBaseIds(kbIds);
    if (chunks.length === 0) return "";
    const results = retrieveHybrid(queryEmbedding, query, chunks, topK);
    return buildRagContext(results);
  } catch (err) {
    console.error(`RAG retrieval failed for agent ${agentId}, continuing without context:`, err);
    return "";
  }
}

/** 把 RAG 上下文并入消息列表的 system prompt（没有 system 消息时插入一条）。 */
export function injectRagContext<T extends { role: string; content: unknown }>(
  messages: T[],
  ragContext: string,
): T[] {
  if (!ragContext) return messages;
  const next = [...messages];
  const first = next[0];
  if (first && first.role === "system" && typeof first.content === "string") {
    next[0] = { ...first, content: first.content + ragContext };
  } else {
    next.unshift({ role: "system", content: ragContext } as T);
  }
  return next;
}
