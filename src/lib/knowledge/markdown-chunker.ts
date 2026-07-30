export type MarkdownChunk = {
  content: string;
  /** 该分片所属的标题路径，如 "安装指南 > 环境准备"；正文位于文档开头时为空串。 */
  heading: string;
};

type Block = {
  text: string;
  /** 标题路径（进入该块时生效） */
  heading: string;
  /** 代码块等原子块不允许在内部被拆开 */
  atomic: boolean;
  /** 表格行所属的表头，续接分片时需要重复表头 */
  tableHeader?: string;
};

const FENCE_PATTERN = /^\s*(```|~~~)/;
const HEADING_PATTERN = /^(#{1,6})\s+(.*)$/;
const TABLE_DIVIDER_PATTERN = /^\s*\|?[\s:|-]+\|[\s:|-]*$/;

function headingPath(stack: string[]): string {
  return stack.filter(Boolean).join(" > ");
}

/**
 * 把 Markdown 拆成"结构块"：代码块整体保留，标题维护层级路径，
 * 表格保留表头，其余按空行分段。
 */
function splitIntoBlocks(text: string): Block[] {
  const lines = text.split(/\r?\n/);
  const blocks: Block[] = [];
  const headingStack: string[] = [];

  let buffer: string[] = [];
  let inFence = false;
  let fenceMarker = "";
  let tableHeader: string | null = null;

  function flush(atomic = false, header?: string) {
    if (buffer.length === 0) return;
    const content = buffer.join("\n").trim();
    buffer = [];
    if (!content) return;
    blocks.push({
      text: content,
      heading: headingPath(headingStack),
      atomic,
      ...(header ? { tableHeader: header } : {}),
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (inFence) {
      buffer.push(line);
      if (FENCE_PATTERN.test(line) && line.trim().startsWith(fenceMarker)) {
        inFence = false;
        flush(true);
      }
      continue;
    }

    const fenceMatch = line.match(FENCE_PATTERN);
    if (fenceMatch) {
      flush(false, tableHeader ?? undefined);
      tableHeader = null;
      inFence = true;
      fenceMarker = fenceMatch[1];
      buffer.push(line);
      continue;
    }

    const headingMatch = line.match(HEADING_PATTERN);
    if (headingMatch) {
      flush(false, tableHeader ?? undefined);
      tableHeader = null;
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      headingStack.length = Math.max(0, level - 1);
      headingStack[level - 1] = title;
      // 标题行本身作为所属小节的起始内容保留，便于分片自解释
      buffer.push(line);
      continue;
    }

    // 表格：识别 "| --- |" 分隔行，把它上一行认作表头
    if (TABLE_DIVIDER_PATTERN.test(line) && line.includes("|") && buffer.length > 0) {
      const headerLine = buffer[buffer.length - 1];
      tableHeader = `${headerLine}\n${line}`;
      buffer.push(line);
      continue;
    }

    if (line.trim() === "") {
      flush(false, tableHeader ?? undefined);
      tableHeader = null;
      continue;
    }

    buffer.push(line);
  }

  if (inFence) flush(true);
  else flush(false, tableHeader ?? undefined);

  return blocks;
}

/** 超长块（如巨大的代码块）按行硬切，尽量不在行中间断开。 */
function splitOversizedBlock(block: Block, chunkSize: number): Block[] {
  const lines = block.text.split("\n");
  const parts: Block[] = [];
  let current: string[] = [];
  let length = 0;

  for (const line of lines) {
    // 单行本身超长：直接按字符切
    if (line.length > chunkSize) {
      if (current.length > 0) {
        parts.push({ ...block, text: current.join("\n") });
        current = [];
        length = 0;
      }
      for (let i = 0; i < line.length; i += chunkSize) {
        parts.push({ ...block, text: line.slice(i, i + chunkSize) });
      }
      continue;
    }

    if (length + line.length + 1 > chunkSize && current.length > 0) {
      parts.push({ ...block, text: current.join("\n") });
      current = [];
      length = 0;
    }
    current.push(line);
    length += line.length + 1;
  }

  if (current.length > 0) parts.push({ ...block, text: current.join("\n") });
  return parts;
}

/** 从上一分片尾部取不超过 overlap 长度的完整行，作为下一分片的重叠上下文。 */
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
 * Markdown 结构感知分片：优先在标题、段落、代码块边界切分，
 * 避免把代码块或表格劈成两半，并为每个分片记录所属标题路径。
 */
export function chunkMarkdown(
  text: string,
  chunkSize: number,
  chunkOverlap: number,
): MarkdownChunk[] {
  if (!text.trim()) return [];

  const rawBlocks = splitIntoBlocks(text);
  const blocks: Block[] = [];
  for (const block of rawBlocks) {
    if (block.text.length > chunkSize) blocks.push(...splitOversizedBlock(block, chunkSize));
    else blocks.push(block);
  }

  const chunks: MarkdownChunk[] = [];
  let currentParts: string[] = [];
  let currentHeading = "";
  let currentLength = 0;

  function commit() {
    if (currentParts.length === 0) return;
    const content = currentParts.join("\n\n").trim();
    currentParts = [];
    currentLength = 0;
    if (content) chunks.push({ content, heading: currentHeading });
  }

  for (const block of blocks) {
    const isEmpty = currentParts.length === 0;

    if (isEmpty) {
      currentHeading = block.heading;
    }

    const projected = currentLength + block.text.length + (isEmpty ? 0 : 2);
    const headingChanged = !isEmpty && block.heading !== currentHeading;

    // 标题变化或容量不足时收口当前分片
    if (!isEmpty && (projected > chunkSize || headingChanged)) {
      const previous = currentParts.join("\n\n");
      commit();

      const overlap = headingChanged ? "" : tailOverlap(previous, chunkOverlap);
      currentHeading = block.heading;
      if (overlap) {
        currentParts.push(overlap);
        currentLength += overlap.length;
      }
      // 表格续接时重复表头，保证分片可独立理解
      if (block.tableHeader && !block.text.startsWith(block.tableHeader)) {
        currentParts.push(block.tableHeader);
        currentLength += block.tableHeader.length + 2;
      }
    }

    currentParts.push(block.text);
    currentLength += block.text.length + 2;
  }

  commit();
  return chunks.filter((c) => c.content.length > 0);
}
