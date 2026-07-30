"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  FileText,
  FileCode2,
  FileSpreadsheet,
  FileType2,
  RefreshCw,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { detectFileKind, type FileKind } from "@/lib/files/file-kind";
import type { KnowledgeDocument } from "@/types/knowledge";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

const KIND_ICONS: Record<FileKind, typeof FileText> = {
  markdown: FileCode2,
  csv: FileSpreadsheet,
  pdf: FileType2,
  json: FileCode2,
  text: FileText,
  image: FileText,
  unknown: FileText,
};

const KIND_COLORS: Record<FileKind, string> = {
  markdown: "text-blue-500",
  csv: "text-emerald-500",
  pdf: "text-red-500",
  json: "text-amber-500",
  text: "text-muted-foreground",
  image: "text-muted-foreground",
  unknown: "text-muted-foreground",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  processing: "secondary",
  completed: "default",
  failed: "destructive",
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  pending: Clock,
  processing: Loader2,
  completed: CheckCircle2,
  failed: AlertCircle,
};

export function DocumentList({
  documents,
  onOpen,
  onReindex,
  onDelete,
  isReindexing,
  isDeleting,
  emptyLabel,
}: {
  documents: KnowledgeDocument[];
  onOpen: (doc: KnowledgeDocument) => void;
  onReindex: (docId: string) => void;
  onDelete: (docId: string) => void;
  isReindexing: boolean;
  isDeleting: boolean;
  emptyLabel?: string;
}) {
  const t = useTranslations("knowledge");
  const locale = useLocale();

  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">{emptyLabel ?? t("noDocuments")}</p>;
  }

  return (
    <div className="rounded-lg border divide-y">
      {documents.map((doc) => {
        const kind = detectFileKind(doc.filename, doc.mimetype);
        const KindIcon = KIND_ICONS[kind];
        const StatusIcon = STATUS_ICONS[doc.status] ?? Clock;
        const isIndexing = doc.status === "pending" || doc.status === "processing";

        return (
          <div
            key={doc.id}
            className="group flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors first:rounded-t-lg last:rounded-b-lg"
            role="button"
            tabIndex={0}
            onClick={() => onOpen(doc)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen(doc);
              }
            }}
          >
            <KindIcon className={`h-4 w-4 shrink-0 ${KIND_COLORS[kind]}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{doc.filename}</p>
              <p className="text-xs text-muted-foreground">
                {formatSize(doc.size)} · {t("chunks", { count: doc.chunkCount })} ·{" "}
                {formatRelativeTime(doc.createdAt, locale)}
              </p>
              {doc.error && <p className="text-xs text-destructive mt-1 line-clamp-2">{doc.error}</p>}
            </div>

            <Badge variant={STATUS_VARIANT[doc.status] ?? "outline"} className="gap-1 shrink-0">
              <StatusIcon className={`h-3 w-3 ${isIndexing ? "animate-spin" : ""}`} />
              {t(`status${doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}`)}
            </Badge>

            <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 cursor-pointer"
                    disabled={isReindexing}
                    aria-label={t("reindex")}
                    onClick={(e) => {
                      e.stopPropagation();
                      onReindex(doc.id);
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("reindex")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive cursor-pointer"
                    disabled={isDeleting}
                    aria-label={t("deleteDocument")}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(doc.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("deleteDocument")}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        );
      })}
    </div>
  );
}
