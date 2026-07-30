import { describe, it, expect } from "vitest";
import { cosineSimilarity, retrieveTopK, retrieveHybrid, buildRagContext, formatSource } from "./retriever";

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });

  it("returns 0 when a vector has zero magnitude", () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe("retrieveTopK", () => {
  const chunks = [
    { id: "a", content: "alpha", embedding: [1, 0], documentId: "d1", filename: "a.md", metadata: { heading: "Intro" } },
    { id: "b", content: "beta", embedding: [0, 1], documentId: "d1", filename: "a.md", metadata: {} },
    { id: "c", content: "gamma", embedding: [0.9, 0.1], documentId: "d2", filename: "b.txt", metadata: null },
  ];

  it("sorts by score and respects topK", () => {
    const results = retrieveTopK([1, 0], chunks, 2);
    expect(results).toHaveLength(2);
    expect(results[0].chunkId).toBe("a");
    expect(results[1].chunkId).toBe("c");
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
  });

  it("surfaces filename and heading metadata", () => {
    const [top] = retrieveTopK([1, 0], chunks, 1);
    expect(top.filename).toBe("a.md");
    expect(top.heading).toBe("Intro");
  });

  it("returns null heading when metadata is missing or empty", () => {
    const results = retrieveTopK([0, 1], chunks, 3);
    const beta = results.find((r) => r.chunkId === "b");
    const gamma = results.find((r) => r.chunkId === "c");
    expect(beta?.heading).toBeNull();
    expect(gamma?.heading).toBeNull();
  });
});

describe("formatSource", () => {
  it("joins filename and heading", () => {
    expect(formatSource({ filename: "guide.md", heading: "Setup > Env" })).toBe("guide.md > Setup > Env");
  });

  it("includes the page number for PDF chunks", () => {
    expect(formatSource({ filename: "spec.pdf", heading: "1.2 接口", page: 3 })).toBe("spec.pdf > P3 > 1.2 接口");
    expect(formatSource({ filename: "spec.pdf", heading: null, page: 7 })).toBe("spec.pdf > P7");
  });

  it("omits missing parts", () => {
    expect(formatSource({ filename: "guide.md", heading: null })).toBe("guide.md");
    expect(formatSource({ filename: null, heading: "Setup" })).toBe("Setup");
    expect(formatSource({ filename: null, heading: null })).toBe("");
  });
});

describe("retrieveHybrid", () => {
  const chunks = [
    // 语义上接近查询向量，但不含关键词
    { id: "vec", content: "部署与回滚的整体流程说明", embedding: [1, 0], documentId: "d1", filename: "a.md", metadata: {} },
    // 关键词精确命中，但向量方向不同
    { id: "kw", content: "错误码 E4013 的处理办法", embedding: [0, 1], documentId: "d1", filename: "b.md", metadata: {} },
    // 两者都不相关
    { id: "noise", content: "无关内容", embedding: [-1, 0], documentId: "d2", filename: "c.txt", metadata: {} },
  ];

  it("returns empty array for an empty corpus", () => {
    expect(retrieveHybrid([1, 0], "任意", [], 5)).toEqual([]);
  });

  it("surfaces keyword-only matches that pure vector search would rank low", () => {
    const results = retrieveHybrid([1, 0], "E4013", chunks, 2);
    const ids = results.map((r) => r.chunkId);
    expect(ids).toContain("kw");
  });

  it("labels how each result was matched", () => {
    const results = retrieveHybrid([0, 1], "E4013", chunks, 3);
    const kw = results.find((r) => r.chunkId === "kw");
    expect(kw?.matchedBy).toBe("both");
    expect(kw?.keywordScore).toBeGreaterThan(0);

    const vec = results.find((r) => r.chunkId === "vec");
    expect(vec?.matchedBy).toBe("vector");
    expect(vec?.keywordScore).toBe(0);
  });

  it("reports both sub-scores alongside the fused score", () => {
    const [top] = retrieveHybrid([1, 0], "部署", chunks, 1);
    expect(top.vectorScore).toBeGreaterThan(0);
    expect(top.score).toBeGreaterThan(0);
  });

  it("respects topK", () => {
    expect(retrieveHybrid([1, 0], "流程", chunks, 1)).toHaveLength(1);
  });

  it("still works when the query has no keyword hits", () => {
    const results = retrieveHybrid([1, 0], "zzz-nonexistent", chunks, 2);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].chunkId).toBe("vec");
  });
});

describe("buildRagContext", () => {
  it("returns empty string with no results", () => {
    expect(buildRagContext([])).toBe("");
  });

  it("labels each reference with its source", () => {
    const context = buildRagContext([
      {
        chunkId: "a",
        content: "alpha body",
        score: 0.9,
        documentId: "d1",
        filename: "guide.md",
        heading: "Setup",
        page: null,
        vectorScore: 0.9,
        keywordScore: 0,
        matchedBy: "vector",
      },
    ]);
    expect(context).toContain("[1] (来源：guide.md > Setup)");
    expect(context).toContain("alpha body");
  });

  it("includes the page number for PDF sources", () => {
    const context = buildRagContext([
      {
        chunkId: "a",
        content: "pdf body",
        score: 0.9,
        documentId: "d1",
        filename: "spec.pdf",
        heading: "1.2 接口",
        page: 4,
        vectorScore: 0.9,
        keywordScore: 0,
        matchedBy: "vector",
      },
    ]);
    expect(context).toContain("spec.pdf > P4 > 1.2 接口");
  });

  it("falls back to a plain numbered reference when the source is unknown", () => {
    const context = buildRagContext([
      {
        chunkId: "a",
        content: "alpha body",
        score: 0.9,
        documentId: "d1",
        filename: null,
        heading: null,
        page: null,
        vectorScore: 0.9,
        keywordScore: 0,
        matchedBy: "vector",
      },
    ]);
    expect(context).toContain("[1] alpha body");
    expect(context).not.toContain("来源：");
  });
});
