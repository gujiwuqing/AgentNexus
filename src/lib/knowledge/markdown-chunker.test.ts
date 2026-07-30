import { describe, it, expect } from "vitest";
import { chunkMarkdown } from "./markdown-chunker";

describe("chunkMarkdown", () => {
  it("returns nothing for blank input", () => {
    expect(chunkMarkdown("", 500, 50)).toEqual([]);
    expect(chunkMarkdown("   \n\n  ", 500, 50)).toEqual([]);
  });

  it("keeps a short document as a single chunk", () => {
    const md = "# Title\n\nJust a short paragraph.";
    const chunks = chunkMarkdown(md, 500, 50);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toContain("Just a short paragraph.");
  });

  it("records the nested heading path for each chunk", () => {
    const md = [
      "# Guide",
      "",
      "Intro paragraph.",
      "",
      "## Setup",
      "",
      "Setup body.",
      "",
      "### Env",
      "",
      "Env body.",
    ].join("\n");

    const chunks = chunkMarkdown(md, 40, 0);
    const headings = chunks.map((c) => c.heading);
    expect(headings).toContain("Guide");
    expect(headings).toContain("Guide > Setup");
    expect(headings).toContain("Guide > Setup > Env");
  });

  it("resets deeper heading levels when going back up", () => {
    const md = [
      "# A",
      "",
      "## B",
      "",
      "### C",
      "",
      "body c",
      "",
      "## D",
      "",
      "body d",
    ].join("\n");

    const chunks = chunkMarkdown(md, 30, 0);
    const dChunk = chunks.find((c) => c.content.includes("body d"));
    expect(dChunk?.heading).toBe("A > D");
  });

  it("never splits a fenced code block across chunks", () => {
    const code = ["```ts", "const a = 1;", "const b = 2;", "const c = 3;", "```"].join("\n");
    const md = `# Code\n\nSome prose before the block.\n\n${code}\n\nSome prose after.`;

    const chunks = chunkMarkdown(md, 60, 0);
    const withFence = chunks.filter((c) => c.content.includes("```"));

    // 代码块整体落在同一个分片里：该分片自身的反引号必须成对
    for (const chunk of withFence) {
      const fences = chunk.content.match(/```/g) ?? [];
      expect(fences.length % 2).toBe(0);
    }
    expect(chunks.some((c) => c.content.includes(code))).toBe(true);
  });

  it("hard-splits a code block that alone exceeds the chunk size", () => {
    const lines = Array.from({ length: 40 }, (_, i) => `line ${i} xxxxxxxxxxxxxxxx`);
    const md = ["```", ...lines, "```"].join("\n");

    const chunks = chunkMarkdown(md, 200, 0);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeLessThanOrEqual(200);
    }
  });

  it("repeats the table header when a table spills into the next chunk", () => {
    const rows = Array.from({ length: 12 }, (_, i) => `| item-${i} | value-${i} |`);
    const md = ["# Data", "", "| Name | Value |", "| --- | --- |", ...rows].join("\n");

    const chunks = chunkMarkdown(md, 120, 0);
    expect(chunks.length).toBeGreaterThan(1);
    const tableChunks = chunks.filter((c) => c.content.includes("| item-"));
    expect(tableChunks.length).toBeGreaterThan(1);
    for (const chunk of tableChunks) {
      expect(chunk.content).toContain("| Name | Value |");
    }
  });

  it("carries overlap from the previous chunk within the same section", () => {
    const paragraphs = Array.from({ length: 6 }, (_, i) => `Paragraph number ${i} with some filler text.`);
    const md = ["# Section", "", ...paragraphs.flatMap((p) => [p, ""])].join("\n");

    const withOverlap = chunkMarkdown(md, 120, 60);
    expect(withOverlap.length).toBeGreaterThan(1);
    const firstTail = withOverlap[0].content.split("\n\n").pop() ?? "";
    expect(withOverlap[1].content).toContain(firstTail);
  });

  it("does not leak overlap across a heading boundary", () => {
    const md = [
      "## First",
      "",
      "Unique marker alpha content here.",
      "",
      "## Second",
      "",
      "Different beta content here.",
    ].join("\n");

    const chunks = chunkMarkdown(md, 60, 40);
    const second = chunks.find((c) => c.content.includes("beta"));
    expect(second?.content).not.toContain("alpha");
  });

  it("keeps every chunk non-empty and within a reasonable bound", () => {
    const md = Array.from({ length: 30 }, (_, i) => `## H${i}\n\nBody text for section ${i}.`).join("\n\n");
    const chunks = chunkMarkdown(md, 100, 20);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.content.trim().length).toBeGreaterThan(0);
    }
  });
});
