"use client";

import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useTranslations } from "next-intl";
import { Send, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FileUploadButton } from "./file-upload-button";
import { FilePreviewList, type PendingFile } from "./file-preview-list";

export type SentAttachment = { id: string; filename: string; mimetype: string; size: number };

/** 供父组件把建议问题填入输入框（而非直接发送）。 */
export type ChatInputHandle = { fill: (text: string) => void };

/**
 * 解析 {{占位符}} 语法：去掉花括号保留提示文字，并返回其在结果中的选区。
 * 填入后选中该段，用户直接打字即可替换，避免"没有上下文就发出去"。
 */
function parsePlaceholder(text: string): { value: string; selection: [number, number] | null } {
  const match = /\{\{([^}]*)\}\}/.exec(text);
  if (!match) return { value: text, selection: null };
  const hint = match[1];
  const value = text.slice(0, match.index) + hint + text.slice(match.index + match[0].length);
  return { value, selection: [match.index, match.index + hint.length] };
}

export const ChatInput = forwardRef<
  ChatInputHandle,
  {
    onSend: (content: string, attachments?: SentAttachment[]) => void;
    onStop?: () => void;
    disabled: boolean;
  }
>(function ChatInput({ onSend, onStop, disabled }, ref) {
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

  useImperativeHandle(ref, () => ({
    fill(text: string) {
      const { value: next, selection } = parsePlaceholder(text);
      setValue(next);
      // 等高度自适应的 effect 跑完再设置选区，否则会被重排后的默认光标覆盖
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        if (selection) el.setSelectionRange(selection[0], selection[1]);
        else el.setSelectionRange(next.length, next.length);
      });
    },
  }));

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
      {/* 与消息列对齐的限宽居中列 */}
      <div className="mx-auto w-full max-w-3xl">
        <FilePreviewList files={pendingFiles} onRemove={removeFile} />
        <div className="p-3 flex gap-2 items-end">
          <FileUploadButton onFilesSelected={handleFilesSelected} disabled={disabled} />
          <textarea
            ref={textareaRef}
            className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
    </div>
  );
});
