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

export async function extractText(buffer: Buffer, mimetype: string): Promise<string> {
  if (isTextFile(mimetype)) {
    return buffer.toString("utf-8");
  }
  if (isPdfFile(mimetype)) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    return result.text;
  }
  return "";
}
