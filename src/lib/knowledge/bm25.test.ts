import { describe, it, expect } from "vitest";
import { tokenize, scoreBm25, fuseByRank } from "./bm25";

describe("tokenize", () => {
  it("keeps latin words whole and lowercases them", () => {
    expect(tokenize("Hello World_42")).toEqual(["hello", "world_42"]);
  });

  it("splits CJK runs into bigrams", () => {
    expect(tokenize("知识库")).toEqual(["知识", "识库"]);
  });

  it("keeps a single CJK character as one token", () => {
    expect(tokenize("库")).toEqual(["库"]);
  });

  it("handles mixed content and drops punctuation", () => {
    expect(tokenize("安装 Node.js，然后")).toEqual(["安装", "node", "js", "然后"]);
  });

  it("returns nothing for empty or symbol-only input", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("!!! ??? ---")).toEqual([]);
  });
});

describe("scoreBm25", () => {
  const docs = [
    { id: "a", content: "如何安装依赖并配置环境变量" },
    { id: "b", content: "部署流程与回滚方案说明" },
    { id: "c", content: "安装完成后的验证步骤" },
  ];

  it("scores only documents containing query terms", () => {
    const scores = scoreBm25("安装", docs);
    expect(scores.has("a")).toBe(true);
    expect(scores.has("c")).toBe(true);
    expect(scores.has("b")).toBe(false);
  });

  it("gives every score a positive value", () => {
    const scores = scoreBm25("安装", docs);
    for (const score of scores.values()) {
      expect(score).toBeGreaterThan(0);
    }
  });

  it("ranks rare terms above common ones", () => {
    const corpus = [
      { id: "common", content: "配置 配置 配置 配置" },
      { id: "rare", content: "配置 灰度发布" },
    ];
    const scores = scoreBm25("灰度发布", corpus);
    expect(scores.get("rare")).toBeGreaterThan(0);
    expect(scores.has("common")).toBe(false);
  });

  it("matches exact latin identifiers", () => {
    const corpus = [
      { id: "x", content: "call getUserById to fetch a user" },
      { id: "y", content: "unrelated content about caching" },
    ];
    const scores = scoreBm25("getuserbyid", corpus);
    expect(scores.has("x")).toBe(true);
    expect(scores.has("y")).toBe(false);
  });

  it("returns empty map for blank query or empty corpus", () => {
    expect(scoreBm25("", docs).size).toBe(0);
    expect(scoreBm25("安装", []).size).toBe(0);
  });
});

describe("fuseByRank", () => {
  it("ranks an item appearing in both lists above single-list items", () => {
    const fused = fuseByRank([
      { ids: ["a", "b", "c"] },
      { ids: ["c", "d"] },
    ]);
    const sorted = [...fused.entries()].sort((x, y) => y[1] - x[1]).map(([id]) => id);
    expect(sorted[0]).toBe("c");
  });

  it("respects per-list weights", () => {
    const keywordOnly = fuseByRank([
      { ids: ["a"], weight: 1 },
      { ids: ["b"], weight: 0.1 },
    ]);
    expect(keywordOnly.get("a")!).toBeGreaterThan(keywordOnly.get("b")!);
  });

  it("preserves rank order within a single list", () => {
    const fused = fuseByRank([{ ids: ["first", "second", "third"] }]);
    expect(fused.get("first")!).toBeGreaterThan(fused.get("second")!);
    expect(fused.get("second")!).toBeGreaterThan(fused.get("third")!);
  });

  it("returns an empty map with no rankings", () => {
    expect(fuseByRank([]).size).toBe(0);
  });
});
