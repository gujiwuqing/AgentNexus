import { describe, it, expect } from "vitest";
import { chunkPdfPages, looksLikeHeading } from "./pdf-chunker";

describe("looksLikeHeading", () => {
  it("recognises Chinese chapter headings", () => {
    expect(looksLikeHeading("第一章 概述")).toBe(true);
    expect(looksLikeHeading("第 3 节 接口约定")).toBe(true);
    expect(looksLikeHeading("第二篇 实施")).toBe(true);
  });

  it("recognises numbered and roman headings", () => {
    expect(looksLikeHeading("1 概述")).toBe(true);
    expect(looksLikeHeading("1.2 安装步骤")).toBe(true);
    expect(looksLikeHeading("3.4.1 依赖说明")).toBe(true);
    expect(looksLikeHeading("II. Background")).toBe(true);
    expect(looksLikeHeading("Appendix A")).toBe(true);
  });

  it("rejects body text", () => {
    expect(looksLikeHeading("这是一段普通的正文内容，用于说明问题。")).toBe(false);
    expect(looksLikeHeading("")).toBe(false);
    // 以句末标点结尾的更像正文
    expect(looksLikeHeading("1.2 这句话以句号结尾。")).toBe(false);
    // 过长的行不认为是标题
    expect(looksLikeHeading(`1.2 ${"x".repeat(120)}`)).toBe(false);
  });
});

describe("chunkPdfPages", () => {
  it("returns nothing for blank pages", () => {
    expect(chunkPdfPages([], 500, 50)).toEqual([]);
    expect(chunkPdfPages([{ page: 1, text: "  \n " }], 500, 50)).toEqual([]);
  });

  it("attributes each chunk to its source page", () => {
    const pages = [
      { page: 1, text: "content of page one" },
      { page: 2, text: "content of page two" },
      { page: 7, text: "content of page seven" },
    ];
    const chunks = chunkPdfPages(pages, 500, 0);
    expect(chunks.map((c) => c.page)).toEqual([1, 2, 7]);
  });

  it("never merges content from different pages into one chunk", () => {
    const pages = [
      { page: 1, text: "alpha" },
      { page: 2, text: "beta" },
    ];
    const chunks = chunkPdfPages(pages, 1000, 0);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].content).not.toContain("beta");
    expect(chunks[1].content).not.toContain("alpha");
  });

  it("captures the nearest heading for following body text", () => {
    const pages = [
      {
        page: 1,
        text: ["1 概述", "这是概述的正文。", "2 安装", "这是安装的正文。"].join("\n"),
      },
    ];
    const chunks = chunkPdfPages(pages, 30, 0);
    const install = chunks.find((c) => c.content.includes("安装的正文"));
    expect(install?.heading).toBe("2 安装");
  });

  it("carries the heading across a page break", () => {
    const pages = [
      { page: 1, text: "3.1 配置项\n第一页的配置说明。" },
      { page: 2, text: "第二页继续说明配置。" },
    ];
    const chunks = chunkPdfPages(pages, 200, 0);
    const secondPage = chunks.find((c) => c.page === 2);
    expect(secondPage?.heading).toBe("3.1 配置项");
  });

  it("splits long pages into multiple chunks within the size limit", () => {
    const lines = Array.from({ length: 40 }, (_, i) => `line ${i} with some filler content`);
    const chunks = chunkPdfPages([{ page: 1, text: lines.join("\n") }], 200, 0);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeLessThanOrEqual(200);
      expect(chunk.page).toBe(1);
    }
  });

  it("hard-splits a single oversized line", () => {
    const chunks = chunkPdfPages([{ page: 3, text: "x".repeat(500) }], 100, 0);
    expect(chunks.length).toBe(5);
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeLessThanOrEqual(100);
      expect(chunk.page).toBe(3);
    }
  });
});
