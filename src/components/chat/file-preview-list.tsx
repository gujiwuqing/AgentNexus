"use client";

import { X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";

export type PendingFile = {
  file: File;
  attachmentId?: string;
  uploading: boolean;
  error?: string;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function FilePreviewList({
  files,
  onRemove,
}: {
  files: PendingFile[];
  onRemove: (index: number) => void;
}) {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-3 pt-2">
      {files.map((f, i) => {
        const isImage = f.file.type.startsWith("image/");
        const Icon = isImage ? ImageIcon : FileText;

        return (
          <div
            key={i}
            className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-xs"
          >
            {f.uploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Icon className="h-3 w-3 text-muted-foreground" />
            )}
            <span className="max-w-[120px] truncate">{f.file.name}</span>
            <span className="text-muted-foreground">{formatSize(f.file.size)}</span>
            {f.error && <span className="text-destructive">{f.error}</span>}
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="ml-0.5 rounded hover:bg-muted p-0.5 cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
