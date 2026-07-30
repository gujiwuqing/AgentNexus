import Link from "next/link";
import { useTranslations } from "next-intl";
import { BookOpen, FileText, Layers, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { KnowledgeBase } from "@/types/knowledge";

export function KnowledgeCard({ kb }: { kb: KnowledgeBase }) {
  const t = useTranslations("knowledge");
  const stats = kb.stats;

  return (
    <Link href={`/knowledge/${kb.id}`}>
      <Card className="hover:border-primary hover:shadow-md transition-all cursor-pointer h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 min-w-0">
            <BookOpen className="h-5 w-5 text-primary shrink-0" />
            <span className="truncate">{kb.name}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-3">
          <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
            {kb.description || t("noDescription")}
          </p>

          {stats && (
            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {t("cardDocuments", { count: stats.documentCount })}
              </span>
              <span className="flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" />
                {t("cardChunks", { count: stats.chunkCount })}
              </span>
              {stats.indexingCount > 0 && (
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t("cardIndexing", { count: stats.indexingCount })}
                </Badge>
              )}
              {stats.failedCount > 0 && (
                <Badge variant="destructive" className="gap-1 text-[10px]">
                  <AlertCircle className="h-3 w-3" />
                  {t("cardFailed", { count: stats.failedCount })}
                </Badge>
              )}
              {stats.documentCount === 0 && (
                <Badge variant="outline" className="text-[10px]">{t("cardEmpty")}</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
