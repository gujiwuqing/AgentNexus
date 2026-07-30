import { describe, it, expect } from "vitest";
import { detectFileKind, isPlainTextKind, fileExtension } from "./file-kind";

describe("fileExtension", () => {
  it("returns lowercased extension", () => {
    expect(fileExtension("README.MD")).toBe("md");
    expect(fileExtension("a.b.csv")).toBe("csv");
  });

  it("returns empty string when there is no usable extension", () => {
    expect(fileExtension("Dockerfile")).toBe("");
    expect(fileExtension("trailing.")).toBe("");
  });
});

describe("detectFileKind", () => {
  it("recognises markdown by extension even when the browser reports a wrong mimetype", () => {
    expect(detectFileKind("notes.md", "application/octet-stream")).toBe("markdown");
    expect(detectFileKind("notes.md", "")).toBe("markdown");
    expect(detectFileKind("notes.markdown", null)).toBe("markdown");
    expect(detectFileKind("notes.mdx", undefined)).toBe("markdown");
  });

  it("recognises other supported kinds by extension", () => {
    expect(detectFileKind("data.csv", "")).toBe("csv");
    expect(detectFileKind("spec.pdf", "")).toBe("pdf");
    expect(detectFileKind("config.json", "")).toBe("json");
    expect(detectFileKind("log.txt", "")).toBe("text");
  });

  it("falls back to mimetype when the extension is unknown", () => {
    expect(detectFileKind("noext", "text/markdown")).toBe("markdown");
    expect(detectFileKind("noext", "application/pdf")).toBe("pdf");
    expect(detectFileKind("noext", "text/x-log")).toBe("text");
    expect(detectFileKind("noext", "image/svg+xml")).toBe("image");
  });

  it("returns unknown when neither extension nor mimetype match", () => {
    expect(detectFileKind("archive.zip", "application/zip")).toBe("unknown");
    expect(detectFileKind("noext", "")).toBe("unknown");
  });
});

describe("isPlainTextKind", () => {
  it("treats markdown, csv, json and text as directly readable", () => {
    expect(isPlainTextKind("markdown")).toBe(true);
    expect(isPlainTextKind("csv")).toBe(true);
    expect(isPlainTextKind("json")).toBe(true);
    expect(isPlainTextKind("text")).toBe(true);
  });

  it("excludes binary kinds", () => {
    expect(isPlainTextKind("pdf")).toBe(false);
    expect(isPlainTextKind("image")).toBe(false);
    expect(isPlainTextKind("unknown")).toBe(false);
  });
});
