"use client";

import { FileText, Download } from "lucide-react";

type AttachmentInfo = {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function MessageAttachments({ attachments }: { attachments: AttachmentInfo[] }) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {attachments.map((att) => {
        const isImage = att.mimetype.startsWith("image/");

        if (isImage) {
          return (
            <a
              key={att.id}
              href={`/api/files/${att.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border overflow-hidden hover:border-primary transition-colors cursor-pointer"
            >
              <img
                src={`/api/files/${att.id}`}
                alt={att.filename}
                className="max-w-[200px] max-h-[150px] object-cover"
              />
            </a>
          );
        }

        return (
          <a
            key={att.id}
            href={`/api/files/${att.id}`}
            download={att.filename}
            className="flex items-center gap-2 rounded-lg border px-3 py-2 hover:border-primary hover:bg-muted/50 transition-all cursor-pointer"
          >
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-sm truncate max-w-[160px]">{att.filename}</p>
              <p className="text-xs text-muted-foreground">{formatSize(att.size)}</p>
            </div>
            <Download className="h-3 w-3 text-muted-foreground" />
          </a>
        );
      })}
    </div>
  );
}
