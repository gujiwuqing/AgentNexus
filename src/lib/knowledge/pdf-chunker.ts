export type PdfChunk = {
  content: string;
  /** 启发式识别出的所属小节标题；识别不到时为空串 */
  heading: string;
  /** 该分片所在页码（跨页时取起始页） */
  page: number;
};

/**
 * 常见标题形态：
 * - 中文章节：第一章 / 第 3 节 / 第二篇
 * - 编号标题：1 概述 / 1.2 安装 / 3.4.1 依赖
 * - 罗马数字：II. Background
 * - 附录：附录 A / Appendix B
 */
const HEADING_PATTERNS: RegExp[] = [
  /^第\s*[0-9０-９一二三四五六七八九十百千]+\s*[章节節篇部]/,
  /^[0-9]+(\.[0-9]+){0,3}[.、]?\s+\S/,
  /^[IVXLC]+[.、]\s+\S/,
  /^(附录|附錄|Appendix)\s*[A-Z0-9]/i,
  /^(Chapter|Section|Part)\s+[0-9IVXLC]+/i,
];

const MAX_HEADING_LENGTH = 80;

/** 判断一行是否像小节标题：足够短、无句末标点、匹配编号/章节形态。 */
export function looksLikeHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > MAX_HEADING_LENGTH) return false;
  // 以句末标点结尾的更像正文
  if (/[。；;]$/.test(trimmed)) return false;
  return HEADING_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function tailOverlap(text: string, overlap: number): string {
  if (overlap <= 0) return "";
  const lines = text.split("\n");
  const picked: string[] = [];
  let length = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (length + line.length + 1 > overlap) break;
    picked.unshift(line);
    length += line.length + 1;
  }
  return picked.join("\n").trim();
}

/**
 * PDF 分片：以页为边界切分（不跨页合并，保证页码归属准确），
 * 页内按行累积到 chunkSize，并沿用最近一次识别到的小节标题。
 */
export function chunkPdfPages(
  pages: Array<{ page: number; text: string }>,
  chunkSize: number,
  chunkOverlap: number,
): PdfChunk[] {
  const chunks: PdfChunk[] = [];
  // 标题跨页延续：上一页末尾的小节标题对下一页开头依然有效
  let currentHeading = "";

  for (const { page, text } of pages) {
    if (!text.trim()) continue;

    const lines = text.split(/\r?\n/);
    let buffer: string[] = [];
    let length = 0;
    let headingForChunk = currentHeading;

    const commit = () => {
      const content = buffer.join("\n").trim();
      buffer = [];
      length = 0;
      if (content) chunks.push({ content, heading: headingForChunk, page });
      headingForChunk = currentHeading;
    };

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      if (!line.trim()) continue;

      const isHeading = looksLikeHeading(line);

      // 遇到新标题时先收口，让每个分片归属单一小节
      if (isHeading && buffer.length > 0) {
        commit();
        currentHeading = line.trim();
        headingForChunk = currentHeading;
      } else if (isHeading) {
        currentHeading = line.trim();
        headingForChunk = currentHeading;
      }

      // 单行超长：先收口再按字符硬切
      if (line.length > chunkSize) {
        if (buffer.length > 0) commit();
        for (let i = 0; i < line.length; i += chunkSize) {
          chunks.push({ content: line.slice(i, i + chunkSize), heading: currentHeading, page });
        }
        continue;
      }

      if (length + line.length + 1 > chunkSize && buffer.length > 0) {
        const previous = buffer.join("\n");
        commit();
        const overlap = tailOverlap(previous, chunkOverlap);
        if (overlap) {
          buffer.push(overlap);
          length += overlap.length + 1;
        }
      }

      buffer.push(line);
      length += line.length + 1;
    }

    if (buffer.length > 0) commit();
  }

  return chunks.filter((c) => c.content.length > 0);
}
