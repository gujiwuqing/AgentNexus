"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Copy, Check, FileText, Layers, Code2, Eye, X, Hash } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownView } from "@/components/markdown/markdown-view";
import { CsvTable } from "./csv-table";
import { HighlightedText, countMatches } from "./highlighted-text";
import { useDocumentContent, useDocumentChunks } from "@/hooks/use-knowledge";
import { detectFileKind } from "@/lib/files/file-kind";
import type { KnowledgeDocument } from "@/types/knowledge";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function chunkHeading(metadata: Record<string, unknown> | null): string | null {
  const heading = metadata?.heading;
  return typeof heading === "string" && heading.trim() !== "" ? heading : null;
}

function chunkPage(metadata: Record<string, unknown> | null): number | null {
  const page = metadata?.page;
  return typeof page === "number" && Number.isFinite(page) ? page : null;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const t = useTranslations("chatExt.codeBlock");
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 cursor-pointer gap-1.5"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? t("copied") : label}
    </Button>
  );
}

export function DocumentViewerDialog({
  kbId,
  doc,
  onClose,
}: {
  kbId: string;
  doc: KnowledgeDocument | null;
  onClose: () => void;
}) {
  const t = useTranslations("knowledge.viewer");
  const [query, setQuery] = useState("");
  const [rawChunks, setRawChunks] = useState(false);
  const open = doc != null;

  const { data: contentData, isLoading: contentLoading, isError: contentError } = useDocumentContent(
    kbId,
    doc?.id ?? "",
    open
  );
  const { data: chunks, isLoading: chunksLoading, isError: chunksError } = useDocumentChunks(
    kbId,
    doc?.id ?? "",
    open
  );

  const kind = doc ? detectFileKind(doc.filename, doc.mimetype) : "unknown";
  const isMarkdown = kind === "markdown";
  const content = contentData?.content ?? "";

  const contentMatches = useMemo(() => countMatches(content, query), [content, query]);
  const filteredChunks = useMemo(() => {
    if (!chunks) return chunks;
    const q = query.trim().toLowerCase();
    if (!q) return chunks;
    return chunks.filter((c) => c.content.toLowerCase().includes(q));
  }, [chunks, query]);

  function handleClose() {
    setQuery("");
    setRawChunks(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b space-y-3">
          <div className="flex items-start gap-3 pr-8">
            <FileText className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-left">{doc?.filename}</DialogTitle>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="secondary" className="text-[10px] uppercase">{kind}</Badge>
                <span className="text-xs text-muted-foreground">{doc ? formatSize(doc.size) : ""}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {t("chunkCount", { count: doc?.chunkCount ?? 0 })}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-8 pl-8 pr-8 text-sm"
              />
              {query && (
                <button
                  type="button"
                  aria-label={t("clearSearch")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                  onClick={() => setQuery("")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {query && (
              <span className="text-xs text-muted-foreground shrink-0">
                {t("matchCount", { count: contentMatches })}
              </span>
            )}
            <div className="flex-1" />
            {content && <CopyButton text={content} label={t("copyAll")} />}
          </div>
        </DialogHeader>

        <Tabs defaultValue={isMarkdown || kind === "csv" ? "preview" : "raw"} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mt-4 self-start">
            <TabsTrigger value="preview" className="gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              {t("tabPreview")}
            </TabsTrigger>
            <TabsTrigger value="raw" className="gap-1.5">
              <Code2 className="h-3.5 w-3.5" />
              {t("tabRaw")}
            </TabsTrigger>
            <TabsTrigger value="chunks" className="gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              {t("tabChunks", { count: chunks?.length ?? 0 })}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="flex-1 overflow-y-auto px-6 pb-6 mt-3">
            {contentLoading && (
              <div className="space-y-3">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            )}
            {contentError && <p className="text-sm text-destructive">{t("loadError")}</p>}
            {contentData && !content.trim() && (
              <p className="text-sm text-muted-foreground py-8 text-center">{t("emptyContent")}</p>
            )}
            {contentData && content.trim() && (
              isMarkdown ? (
                <MarkdownView content={content} size="base" />
              ) : kind === "csv" ? (
                <CsvTable content={content} />
              ) : (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  <HighlightedText text={content} query={query} />
                </p>
              )
            )}
          </TabsContent>

          <TabsContent value="raw" className="flex-1 overflow-y-auto px-6 pb-6 mt-3">
            {contentLoading && <Skeleton className="h-64 w-full" />}
            {contentError && <p className="text-sm text-destructive">{t("loadError")}</p>}
            {contentData && (
              <pre className="text-xs font-mono whitespace-pre-wrap bg-muted rounded-lg p-4 leading-relaxed">
                <HighlightedText text={content} query={query} />
              </pre>
            )}
          </TabsContent>

          <TabsContent value="chunks" className="flex-1 overflow-y-auto px-6 pb-6 mt-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">
                {query
                  ? t("chunkFiltered", { shown: filteredChunks?.length ?? 0, total: chunks?.length ?? 0 })
                  : t("chunkHint")}
              </p>
              {isMarkdown && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs cursor-pointer gap-1.5"
                  onClick={() => setRawChunks((v) => !v)}
                >
                  {rawChunks ? <Eye className="h-3.5 w-3.5" /> : <Code2 className="h-3.5 w-3.5" />}
                  {rawChunks ? t("showRendered") : t("showRaw")}
                </Button>
              )}
            </div>

            {chunksLoading && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            )}
            {chunksError && <p className="text-sm text-destructive">{t("chunkLoadError")}</p>}
            {chunks && chunks.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">{t("chunkEmpty")}</p>
            )}
            {filteredChunks && chunks && chunks.length > 0 && filteredChunks.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">{t("chunkNoMatch")}</p>
            )}

            <div className="space-y-2">
              {filteredChunks?.map((chunk) => {
                const heading = chunkHeading(chunk.metadata);
                const page = chunkPage(chunk.metadata);
                return (
                  <div key={chunk.id} className="rounded-lg border overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border-b">
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {t("chunkLabel", { index: chunk.chunkIndex + 1 })}
                      </Badge>
                      {page != null && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0">
                          {t("page", { page })}
                        </Badge>
                      )}
                      {heading && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                          <Hash className="h-3 w-3 shrink-0" />
                          {heading}
                        </span>
                      )}
                      <div className="flex-1" />
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {t("chars", { count: chunk.content.length })}
                      </span>
                    </div>
                    <div className="px-3 py-2">
                      {isMarkdown && !rawChunks && !query ? (
                        <MarkdownView content={chunk.content} size="sm" />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          <HighlightedText text={chunk.content} query={query} />
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
