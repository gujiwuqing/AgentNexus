"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTestRetrieval } from "@/hooks/use-knowledge";

function scoreColor(score: number): string {
  if (score >= 0.8) return "bg-green-500";
  if (score >= 0.6) return "bg-yellow-500";
  return "bg-muted-foreground/50";
}

export function RetrievalTestPanel({ knowledgeBaseId }: { knowledgeBaseId: string }) {
  const t = useTranslations("knowledge");
  const [query, setQuery] = useState("");
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
          {testRetrieval.data.map((r, i) => (
            <div key={r.chunkId} className="rounded-md border p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-muted-foreground truncate">
                  #{i + 1} {r.filename}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${scoreColor(r.score)}`}
                      style={{ width: `${Math.max(0, Math.min(1, r.score)) * 100}%` }}
                    />
                  </div>
                  <Badge variant="secondary">{t("retrievalTest.score", { score: r.score.toFixed(3) })}</Badge>
                </div>
              </div>
              <p className="text-sm text-foreground/90 line-clamp-4 whitespace-pre-wrap">{r.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
