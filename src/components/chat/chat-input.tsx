"use client";

import { useRef, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Send, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FileUploadButton } from "./file-upload-button";
import { FilePreviewList, type PendingFile } from "./file-preview-list";

export type SentAttachment = { id: string; filename: string; mimetype: string; size: number };

export function ChatInput({
  onSend,
  onStop,
  disabled,
}: {
  onSend: (content: string, attachments?: SentAttachment[]) => void;
  onStop?: () => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const t = useTranslations("chatExt.input");

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 150) + "px";
  }, [value]);

  async function uploadFile(file: File, index: number) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/files/upload", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? t("uploadFailed"));
      setPendingFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, uploading: false, attachmentId: body.data.id } : f))
      );
    } catch (err) {
      setPendingFiles((prev) =>
        prev.map((f, i) =>
          i === index ? { ...f, uploading: false, error: err instanceof Error ? err.message : t("uploadFailed") } : f
        )
      );
      toast.error(err instanceof Error ? err.message : t("uploadFailed"));
    }
  }

  function handleFilesSelected(files: File[]) {
    const startIndex = pendingFiles.length;
    setPendingFiles((prev) => [...prev, ...files.map((file) => ({ file, uploading: true }))]);
    files.forEach((file, i) => uploadFile(file, startIndex + i));
  }

  function removeFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  const isUploading = pendingFiles.some((f) => f.uploading);
  const hasFileError = pendingFiles.some((f) => f.error);

  function submit() {
    const trimmed = value.trim();
    if ((!trimmed && pendingFiles.length === 0) || disabled || isUploading) return;
    const attachments = pendingFiles
      .filter((f) => f.attachmentId)
      .map((f) => ({
        id: f.attachmentId!,
        filename: f.file.name,
        mimetype: f.file.type,
        size: f.file.size,
      }));
    onSend(trimmed, attachments.length > 0 ? attachments : undefined);
    setValue("");
    setPendingFiles([]);
  }

  return (
    <div className="border-t">
      <FilePreviewList files={pendingFiles} onRemove={removeFile} />
      <div className="p-3 flex gap-2 items-end">
        <FileUploadButton onFilesSelected={handleFilesSelected} disabled={disabled} />
        <textarea
          ref={textareaRef}
          className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={t("placeholder")}
          rows={1}
          disabled={disabled}
        />
        {disabled && onStop ? (
          <Button variant="destructive" size="icon" onClick={onStop} aria-label={t("stop")}>
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={submit}
            disabled={disabled || isUploading || hasFileError || (!value.trim() && pendingFiles.length === 0)}
            aria-label={t("send")}
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
