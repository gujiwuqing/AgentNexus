export function chunkText(
  text: string,
  chunkSize: number,
  chunkOverlap: number,
): string[] {
  if (!text.trim()) return [];
  if (text.length <= chunkSize) return [text.trim()];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;
    if (end >= text.length) {
      chunks.push(text.slice(start).trim());
      break;
    }

    const searchStart = Math.max(start + Math.floor(chunkSize * 0.8), start);
    const segment = text.slice(searchStart, end);

    const newlineIdx = segment.lastIndexOf("\n");
    if (newlineIdx >= 0) {
      end = searchStart + newlineIdx + 1;
    } else {
      const periodIdx = segment.lastIndexOf("。");
      const dotIdx = segment.lastIndexOf(". ");
      const breakIdx = Math.max(periodIdx, dotIdx);
      if (breakIdx >= 0) {
        end = searchStart + breakIdx + 1;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);

    start = end - chunkOverlap;
    if (start <= 0 && chunks.length > 0) {
      start = end;
    }
  }

  return chunks.filter((c) => c.length > 0);
}
