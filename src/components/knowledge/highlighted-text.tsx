"use client";

import { useMemo } from "react";

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 计算 query 在 text 中出现的次数（不区分大小写）。 */
export function countMatches(text: string, query: string): number {
  const q = query.trim();
  if (!q) return 0;
  const matches = text.match(new RegExp(escapeRegExp(q), "gi"));
  return matches?.length ?? 0;
}

/** 纯文本内容中高亮命中的关键词。 */
export function HighlightedText({
  text,
  query,
  className,
}: {
  text: string;
  query: string;
  className?: string;
}) {
  const parts = useMemo(() => {
    const q = query.trim();
    if (!q) return [text];
    return text.split(new RegExp(`(${escapeRegExp(q)})`, "gi"));
  }, [text, query]);

  const lowerQuery = query.trim().toLowerCase();

  return (
    <span className={className}>
      {parts.map((part, i) =>
        lowerQuery && part.toLowerCase() === lowerQuery ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-500/40 text-foreground rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}
