"use client";

import { useTranslations } from "next-intl";
import { FileText, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { KnowledgeDocument } from "@/types/knowledge";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  processing: "secondary",
  completed: "default",
  failed: "destructive",
};

export function DocumentList({
  documents,
  onReindex,
  onDelete,
  isReindexing,
  isDeleting,
  renderPreview,
}: {
  documents: KnowledgeDocument[];
  onReindex: (docId: string) => void;
  onDelete: (docId: string) => void;
  isReindexing: boolean;
  isDeleting: boolean;
  renderPreview?: (doc: KnowledgeDocument) => React.ReactNode;
}) {
  const t = useTranslations("knowledge");

  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">{t("noDocuments")}</p>;
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center gap-3 rounded-lg border p-3"
        >
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{doc.filename}</p>
            <p className="text-xs text-muted-foreground">
              {formatSize(doc.size)} · {t("chunks", { count: doc.chunkCount })}
            </p>
            {doc.error && (
              <p className="text-xs text-destructive mt-1">{doc.error}</p>
            )}
          </div>
          <Badge variant={STATUS_VARIANT[doc.status] ?? "outline"}>
            {t(`status${doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}`)}
          </Badge>
          <div className="flex gap-1">
            {renderPreview && renderPreview(doc)}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 cursor-pointer"
              disabled={isReindexing}
              onClick={() => onReindex(doc.id)}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive cursor-pointer"
              disabled={isDeleting}
              onClick={() => onDelete(doc.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
