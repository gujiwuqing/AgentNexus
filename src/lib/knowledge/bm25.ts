/**
 * 轻量 BM25 实现，用于和向量检索做混合排序。
 * 中文没有空格分词，这里对 CJK 采用二元组（bigram）切分——无需词典依赖，
 * 对"精确术语 / 编号 / 专有名词"类查询的召回效果明显优于纯向量检索。
 */

const CJK_PATTERN = /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/;
const TOKEN_PATTERN = /[a-z0-9_]+|[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]+/gi;

/** 把文本切成检索词：拉丁词整体保留，CJK 串切成二元组（单字串保留单字）。 */
export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const matches = text.toLowerCase().match(TOKEN_PATTERN) ?? [];

  for (const match of matches) {
    if (CJK_PATTERN.test(match)) {
      if (match.length === 1) {
        tokens.push(match);
        continue;
      }
      for (let i = 0; i < match.length - 1; i++) {
        tokens.push(match.slice(i, i + 2));
      }
    } else {
      tokens.push(match);
    }
  }

  return tokens;
}

const K1 = 1.2;
const B = 0.75;

export type Bm25Document = { id: string; content: string };

/**
 * 对文档集合计算 query 的 BM25 分数。返回 id → score 映射（仅含命中文档）。
 * 语料规模由知识库分片数决定，量级为千级时在应用层计算完全可接受。
 */
export function scoreBm25(query: string, documents: Bm25Document[]): Map<string, number> {
  const scores = new Map<string, number>();
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0 || documents.length === 0) return scores;

  const docTokens = documents.map((doc) => tokenize(doc.content));
  const docLengths = docTokens.map((tokens) => tokens.length);
  const avgLength = docLengths.reduce((sum, n) => sum + n, 0) / documents.length || 1;

  const termFrequencies = docTokens.map((tokens) => {
    const tf = new Map<string, number>();
    for (const token of tokens) tf.set(token, (tf.get(token) ?? 0) + 1);
    return tf;
  });

  const uniqueQueryTokens = [...new Set(queryTokens)];

  for (const term of uniqueQueryTokens) {
    let docFreq = 0;
    for (const tf of termFrequencies) {
      if (tf.has(term)) docFreq++;
    }
    if (docFreq === 0) continue;

    // BM25 的概率型 idf，加 1 保证非负
    const idf = Math.log(1 + (documents.length - docFreq + 0.5) / (docFreq + 0.5));

    for (let i = 0; i < documents.length; i++) {
      const freq = termFrequencies[i].get(term);
      if (!freq) continue;
      const norm = freq * (K1 + 1) / (freq + K1 * (1 - B + B * (docLengths[i] / avgLength)));
      const doc = documents[i];
      scores.set(doc.id, (scores.get(doc.id) ?? 0) + idf * norm);
    }
  }

  return scores;
}

const RRF_K = 60;

/**
 * Reciprocal Rank Fusion：按各路排名倒数加权求和。
 * 相比归一化分数相加，RRF 不受两路分数量纲差异影响，是混合检索的稳健默认做法。
 */
export function fuseByRank(
  rankings: Array<{ ids: string[]; weight?: number }>,
  k = RRF_K,
): Map<string, number> {
  const fused = new Map<string, number>();
  for (const { ids, weight = 1 } of rankings) {
    ids.forEach((id, index) => {
      fused.set(id, (fused.get(id) ?? 0) + weight / (k + index + 1));
    });
  }
  return fused;
}
