export type FileKind = "markdown" | "csv" | "pdf" | "json" | "text" | "image" | "unknown";

const EXTENSION_KINDS: Record<string, FileKind> = {
  md: "markdown",
  markdown: "markdown",
  mdx: "markdown",
  csv: "csv",
  pdf: "pdf",
  json: "json",
  txt: "text",
  log: "text",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
};

const MIMETYPE_KINDS: Record<string, FileKind> = {
  "text/markdown": "markdown",
  "text/x-markdown": "markdown",
  "text/csv": "csv",
  "application/csv": "csv",
  "application/pdf": "pdf",
  "application/json": "json",
  "text/plain": "text",
  "image/png": "image",
  "image/jpeg": "image",
  "image/gif": "image",
  "image/webp": "image",
};

export function fileExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  if (idx < 0 || idx === filename.length - 1) return "";
  return filename.slice(idx + 1).toLowerCase();
}

/**
 * 识别文件类别。扩展名优先于 mimetype——浏览器对 .md / .csv 的 MIME 探测不可靠
 * （可能给出空串或 application/octet-stream），仅依赖 mimetype 会导致误拒或提取空文本。
 */
export function detectFileKind(filename: string, mimetype?: string | null): FileKind {
  const byExtension = EXTENSION_KINDS[fileExtension(filename)];
  if (byExtension) return byExtension;
  const byMimetype = mimetype ? MIMETYPE_KINDS[mimetype.toLowerCase()] : undefined;
  if (byMimetype) return byMimetype;
  if (mimetype?.startsWith("text/")) return "text";
  if (mimetype?.startsWith("image/")) return "image";
  return "unknown";
}

/** 该类别是否可直接按 UTF-8 文本读取。 */
export function isPlainTextKind(kind: FileKind): boolean {
  return kind === "markdown" || kind === "csv" || kind === "json" || kind === "text";
}
