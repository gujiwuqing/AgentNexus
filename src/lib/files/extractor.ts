import { detectFileKind, isPlainTextKind } from "./file-kind";

const TEXT_MIMETYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
]);

const IMAGE_MIMETYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

export function isTextFile(mimetype: string): boolean {
  return TEXT_MIMETYPES.has(mimetype);
}

export function isImageFile(mimetype: string): boolean {
  return IMAGE_MIMETYPES.has(mimetype);
}

export function isPdfFile(mimetype: string): boolean {
  return mimetype === "application/pdf";
}

/**
 * 提取文件文本内容。传入 filename 时按扩展名兜底识别类型，
 * 避免浏览器 mimetype 探测不准（如 .md 给出 octet-stream）导致提取为空。
 */
export async function extractText(buffer: Buffer, mimetype: string, filename?: string): Promise<string> {
  const kind = filename ? detectFileKind(filename, mimetype) : null;

  if (isTextFile(mimetype) || (kind && isPlainTextKind(kind))) {
    return buffer.toString("utf-8");
  }
  if (isPdfFile(mimetype) || kind === "pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    return result.text;
  }
  return "";
}

export type PdfPage = { page: number; text: string };

/** 按页提取 PDF 文本，供索引时保留页码归属。 */
export async function extractPdfPages(buffer: Buffer): Promise<PdfPage[]> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  return result.pages.map((p) => ({ page: p.num, text: p.text }));
}
