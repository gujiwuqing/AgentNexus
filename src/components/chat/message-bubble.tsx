"use client";

import { useTranslations } from "next-intl";
import { MarkdownContent } from "./markdown-content";
import { MessageActions } from "./message-actions";
import { ToolCallBlock } from "./tool-call-block";
import type { MessageMeta } from "@/hooks/use-chat-stream";

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function MessageBubble({
  role,
  content,
  createdAt,
  avatar,
  meta,
  toolCalls,
  isLast,
  onRegenerate,
  onDelete,
}: {
  role: string;
  content: string;
  createdAt?: string;
  avatar?: string;
  meta?: MessageMeta;
  toolCalls?: Array<{ toolName: string; displayName: string; args: Record<string, unknown>; result: string }>;
  isLast: boolean;
  onRegenerate?: () => void;
  onDelete?: () => void;
}) {
  const t = useTranslations("chatExt.actions");
  const isUser = role === "user";
  const isError = role === "error";
  const time = createdAt ? formatTime(createdAt) : "";
  const assistantAvatar = avatar || "🤖";
  const showMeta =
    role === "assistant" &&
    meta &&
    (meta.model || meta.durationMs != null || meta.totalTokens != null);

  return (
    <div className={`group flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {!isError && (
        <div className="w-7 h-7 shrink-0 rounded-full bg-muted flex items-center justify-center text-sm select-none">
          {isUser ? "🧑" : assistantAvatar}
        </div>
      )}
      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`max-w-[70%] rounded-lg px-4 py-2 text-sm ${
            isError
              ? "bg-destructive/10 text-destructive border border-destructive/30 whitespace-pre-wrap"
              : isUser
                ? "bg-primary text-primary-foreground whitespace-pre-wrap"
                : "bg-muted"
          }`}
        >
          {!isUser && !isError ? (
            content ? <MarkdownContent content={content} /> : "..."
          ) : (
            content || ""
          )}
        </div>
        {time && (
          <span className="text-[10px] text-muted-foreground mt-0.5 px-1">{time}</span>
        )}
        {toolCalls && toolCalls.length > 0 && <ToolCallBlock toolCalls={toolCalls} />}
        {showMeta && meta && (
          <span className="text-[10px] text-muted-foreground px-1">
            {meta.model ? meta.model : ""}
            {meta.durationMs != null ? ` · ${(meta.durationMs / 1000).toFixed(2)}s` : ""}
            {meta.totalTokens != null
              ? ` · ${meta.totalTokens} ${t("tokens")} (${t("in")} ${meta.promptTokens ?? "-"} / ${t("out")} ${meta.completionTokens ?? "-"})`
              : ""}
          </span>
        )}
        {role !== "error" && content && (
          <MessageActions
            role={role}
            content={content}
            isLast={isLast}
            onRegenerate={onRegenerate}
            onDelete={onDelete}
          />
        )}
      </div>
    </div>
  );
}
