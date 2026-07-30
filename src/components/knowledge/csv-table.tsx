"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

/** 解析一行 CSV，处理双引号包裹与转义（"" 表示字面量引号）。 */
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

const MAX_ROWS = 500;

export function CsvTable({ content }: { content: string }) {
  const t = useTranslations("knowledge.viewer");
  const { header, rows, truncated } = useMemo(() => {
    const lines = content.split(/\r?\n/).filter((l) => l.trim() !== "");
    const parsed = lines.slice(0, MAX_ROWS + 1).map(parseCsvLine);
    return {
      header: parsed[0] ?? [],
      rows: parsed.slice(1),
      truncated: lines.length > MAX_ROWS + 1,
    };
  }, [content]);

  if (header.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 sticky top-0">
            <tr>
              {header.map((cell, i) => (
                <th key={i} className="px-3 py-2 text-left font-medium whitespace-nowrap border-b">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="hover:bg-muted/40">
                {header.map((_, ci) => (
                  <td key={ci} className="px-3 py-1.5 border-b border-border/50 align-top">
                    {row[ci] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {truncated && (
        <p className="text-xs text-muted-foreground">{t("csvTruncated", { count: MAX_ROWS })}</p>
      )}
    </div>
  );
}
