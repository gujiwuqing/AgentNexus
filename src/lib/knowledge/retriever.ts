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
};

export type RetrievalResult = {
  chunkId: string;
  content: string;
  score: number;
  documentId: string;
};

export function retrieveTopK(
  queryEmbedding: number[],
  chunks: ChunkWithEmbedding[],
  topK: number,
): RetrievalResult[] {
  const scored = chunks.map((chunk) => ({
    chunkId: chunk.id,
    content: chunk.content,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
    documentId: chunk.documentId,
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export function buildRagContext(results: RetrievalResult[]): string {
  if (results.length === 0) return "";
  const refs = results
    .map((r, i) => `[${i + 1}] ${r.content}`)
    .join("\n\n");
  return `\n\n--- 以下是从知识库检索到的相关参考资料，请基于这些内容回答用户问题 ---\n${refs}\n--- 参考资料结束 ---`;
}
