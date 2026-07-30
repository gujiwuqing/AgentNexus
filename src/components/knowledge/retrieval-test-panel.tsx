"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Loader2, ChevronDown, ChevronRight, Hash } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MarkdownView } from "@/components/markdown/markdown-view";
import { detectFileKind } from "@/lib/files/file-kind";
import { useTestRetrieval } from "@/hooks/use-knowledge";

function scoreColor(score: number): string {
  if (score >= 0.8) return "bg-green-500";
  if (score >= 0.6) return "bg-yellow-500";
  return "bg-muted-foreground/50";
}

const MATCH_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  both: "default",
  vector: "secondary",
  keyword: "outline",
};

export function RetrievalTestPanel({ knowledgeBaseId }: { knowledgeBaseId: string }) {
  const t = useTranslations("knowledge");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const testRetrieval = useTestRetrieval(knowledgeBaseId);

  function handleSearch() {
    if (!query.trim()) return;
    testRetrieval.mutate({ query: query.trim(), topK: 5 });
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h3 className="text-sm font-semibold">{t("retrievalTest.title")}</h3>
      <p className="text-xs text-muted-foreground">{t("retrievalTest.description")}</p>
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder={t("retrievalTest.placeholder")}
        />
        <Button onClick={handleSearch} disabled={testRetrieval.isPending || !query.trim()}>
          {testRetrieval.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {t("retrievalTest.search")}
        </Button>
      </div>

      {testRetrieval.isError && (
        <p className="text-sm text-destructive">{testRetrieval.error.message}</p>
      )}

      {testRetrieval.isSuccess && testRetrieval.data.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("retrievalTest.noResults")}</p>
      )}

      {testRetrieval.isSuccess && testRetrieval.data.length > 0 && (
        <div className="space-y-2">
          {testRetrieval.data.map((r, i) => {
            const isMarkdown = r.filename ? detectFileKind(r.filename) === "markdown" : false;
            const isExpanded = expanded === r.chunkId;
            return (
              <div key={r.chunkId} className="rounded-md border p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    className="flex items-center gap-1 min-w-0 cursor-pointer"
                    onClick={() => setExpanded(isExpanded ? null : r.chunkId)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                    )}
                    <span className="text-xs font-medium text-muted-foreground truncate">
                      #{i + 1} {r.filename}
                    </span>
                    {r.page != null && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0">
                        {t("retrievalTest.page", { page: r.page })}
                      </Badge>
                    )}
                    {r.heading && (
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground/80 truncate">
                        <Hash className="h-3 w-3 shrink-0" />
                        {r.heading}
                      </span>
                    )}
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={MATCH_VARIANT[r.matchedBy] ?? "outline"} className="text-[10px]">
                      {t(`retrievalTest.matched${r.matchedBy === "both" ? "Both" : r.matchedBy === "vector" ? "Vector" : "Keyword"}`)}
                    </Badge>
                    <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${scoreColor(r.vectorScore)}`}
                        style={{ width: `${Math.max(0, Math.min(1, r.vectorScore)) * 100}%` }}
                      />
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {t("retrievalTest.score", { score: r.vectorScore.toFixed(3) })}
                    </Badge>
                  </div>
                </div>
                {isExpanded && isMarkdown ? (
                  <MarkdownView content={r.content} size="sm" />
                ) : (
                  <p className={`text-sm text-foreground/90 whitespace-pre-wrap ${isExpanded ? "" : "line-clamp-4"}`}>
                    {r.content}
                  </p>
                )}
                {isExpanded && (
                  <p className="text-[10px] text-muted-foreground pt-1 border-t">
                    {t("retrievalTest.scoreDetail", {
                      vector: r.vectorScore.toFixed(3),
                      keyword: r.keywordScore.toFixed(2),
                    })}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
