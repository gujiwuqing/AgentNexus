import { scoreBm25, fuseByRank } from "./bm25";

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export type ChunkWithEmbedding = {
  id: string;
  content: string;
  embedding: number[];
  documentId: string;
  filename?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type RetrievalResult = {
  chunkId: string;
  content: string;
  score: number;
  documentId: string;
  filename: string | null;
  /** 分片所属标题路径（Markdown / PDF 启发式识别） */
  heading: string | null;
  /** PDF 分片所在页码 */
  page: number | null;
  /** 向量相似度（余弦） */
  vectorScore: number;
  /** 关键词 BM25 分数，0 表示未命中 */
  keywordScore: number;
  /** 命中来源：两路都命中 / 仅向量 / 仅关键词 */
  matchedBy: "both" | "vector" | "keyword";
};

function readHeading(metadata: Record<string, unknown> | null | undefined): string | null {
  const heading = metadata?.heading;
  return typeof heading === "string" && heading.trim() !== "" ? heading : null;
}

function readPage(metadata: Record<string, unknown> | null | undefined): number | null {
  const page = metadata?.page;
  return typeof page === "number" && Number.isFinite(page) ? page : null;
}

export function retrieveTopK(
  queryEmbedding: number[],
  chunks: ChunkWithEmbedding[],
  topK: number,
): RetrievalResult[] {
  const scored = chunks.map((chunk) => {
    const vectorScore = cosineSimilarity(queryEmbedding, chunk.embedding);
    return {
      chunkId: chunk.id,
      content: chunk.content,
      score: vectorScore,
      documentId: chunk.documentId,
      filename: chunk.filename ?? null,
      heading: readHeading(chunk.metadata),
      page: readPage(chunk.metadata),
      vectorScore,
      keywordScore: 0,
      matchedBy: "vector" as const,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

/**
 * 混合检索：向量语义检索 + BM25 关键词检索，用 RRF 融合排名。
 * 向量善于语义近似，关键词善于精确术语/编号，两路互补。
 */
export function retrieveHybrid(
  queryEmbedding: number[],
  query: string,
  chunks: ChunkWithEmbedding[],
  topK: number,
  options?: { vectorWeight?: number; keywordWeight?: number; candidates?: number },
): RetrievalResult[] {
  if (chunks.length === 0) return [];

  const vectorWeight = options?.vectorWeight ?? 1;
  const keywordWeight = options?.keywordWeight ?? 0.6;
  // 参与融合的候选集：取较大值以保留召回，同时避免给长尾排名记分
  const candidates = options?.candidates ?? Math.max(topK * 5, 20);

  const vectorScores = new Map<string, number>();
  for (const chunk of chunks) {
    vectorScores.set(chunk.id, cosineSimilarity(queryEmbedding, chunk.embedding));
  }
  const vectorRanking = [...vectorScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, candidates)
    .map(([id]) => id);

  const keywordScores = scoreBm25(
    query,
    chunks.map((c) => ({ id: c.id, content: c.content })),
  );
  const keywordRanking = [...keywordScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, candidates)
    .map(([id]) => id);

  const fused = fuseByRank([
    { ids: vectorRanking, weight: vectorWeight },
    { ids: keywordRanking, weight: keywordWeight },
  ]);

  const vectorTop = new Set(vectorRanking);
  const keywordTop = new Set(keywordRanking);
  const chunkById = new Map(chunks.map((c) => [c.id, c]));

  return [...fused.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([chunkId, score]) => {
      const chunk = chunkById.get(chunkId)!;
      const inVector = vectorTop.has(chunkId);
      const inKeyword = keywordTop.has(chunkId);
      return {
        chunkId,
        content: chunk.content,
        score,
        documentId: chunk.documentId,
        filename: chunk.filename ?? null,
        heading: readHeading(chunk.metadata),
        page: readPage(chunk.metadata),
        vectorScore: vectorScores.get(chunkId) ?? 0,
        keywordScore: keywordScores.get(chunkId) ?? 0,
        matchedBy: inVector && inKeyword ? ("both" as const) : inKeyword ? ("keyword" as const) : ("vector" as const),
      };
    });
}

/** 拼接引用来源标签，如 "guide.md > 安装 > 环境准备" 或 "spec.pdf > P3 > 1.2 接口"。 */
export function formatSource(
  result: Pick<RetrievalResult, "filename" | "heading"> & { page?: number | null },
): string {
  const page = result.page != null ? `P${result.page}` : null;
  return [result.filename, page, result.heading].filter(Boolean).join(" > ");
}

export function buildRagContext(results: RetrievalResult[]): string {
  if (results.length === 0) return "";
  const refs = results
    .map((r, i) => {
      const source = formatSource(r);
      return source ? `[${i + 1}] (来源：${source})\n${r.content}` : `[${i + 1}] ${r.content}`;
    })
    .join("\n\n");
  return `\n\n--- 以下是从知识库检索到的相关参考资料，仅供参考。如果参考资料与用户问题相关，请优先基于这些内容回答并标注来源；如果参考资料与问题无关，请忽略这些资料，直接用你自身的知识回答用户问题 ---\n${refs}\n--- 参考资料结束 ---`;
}
