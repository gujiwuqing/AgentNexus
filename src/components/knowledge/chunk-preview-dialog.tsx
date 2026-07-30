"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Layers } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDocumentChunks } from "@/hooks/use-knowledge";

export function ChunkPreviewDialog({
  kbId,
  docId,
  filename,
  chunkCount,
}: {
  kbId: string;
  docId: string;
  filename: string;
  chunkCount: number;
}) {
  const t = useTranslations("knowledge.chunkPreview");
  const [open, setOpen] = useState(false);
  const { data: chunks, isLoading, isError } = useDocumentChunks(kbId, docId, open);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" aria-label={t("title", { filename })}>
          <Layers className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{t("title", { filename })}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">{t("summary", { count: chunkCount })}</p>
        <div className="overflow-y-auto max-h-[60vh] space-y-2">
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          )}
          {isError && <p className="text-sm text-destructive">{t("loadError")}</p>}
          {chunks && chunks.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">{t("empty")}</p>
          )}
          {chunks?.map((chunk) => (
            <div key={chunk.id} className="rounded-md border p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-[10px]">
                  {t("chunkLabel", { index: chunk.chunkIndex + 1 })}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {t("chars", { count: chunk.content.length })}
                </span>
              </div>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap">{chunk.content}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
