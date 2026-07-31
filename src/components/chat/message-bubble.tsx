"use client";

import { memo, useState } from "react";
import { useTranslations } from "next-intl";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownContent } from "./markdown-content";
import { MessageActions } from "./message-actions";
import { ToolCallBlock } from "./tool-call-block";
import { SkillBadges } from "./skill-badges";
import { TracePanel } from "./trace-panel";
import { TypingDots } from "./typing-dots";
import { MessageAttachments } from "./message-attachments";
import { AgentAvatar } from "@/components/agents/agent-avatar";
import type { MessageMeta } from "@/hooks/use-chat-stream";

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function MessageBubbleImpl({
  id,
  role,
  content,
  createdAt,
  avatar,
  meta,
  attachments,
  toolCalls,
  activeSkills,
  isLast,
  onRegenerate,
  onRegenerateFrom,
  onDelete,
  onEditResend,
}: {
  id: string;
  role: string;
  content: string;
  createdAt?: string;
  avatar?: string;
  meta?: MessageMeta;
  attachments?: Array<{ id: string; filename: string; mimetype: string; size: number }>;
  toolCalls?: Array<{ toolName: string; displayName: string; args: Record<string, unknown>; result: string }>;
  activeSkills?: Array<{ name: string; icon: string }> | null;
  isLast: boolean;
  onRegenerate?: () => void;
  onRegenerateFrom?: (id: string) => void;
  onDelete?: (id: string) => void;
  onEditResend?: (id: string, content: string) => void;
}) {
  const t = useTranslations("chatExt.actions");
  const tCommon = useTranslations("common");
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [showTrace, setShowTrace] = useState(false);
  const isUser = role === "user";
  const isError = role === "error";
  const time = createdAt ? formatTime(createdAt) : "";
  const showMeta =
    role === "assistant" &&
    meta &&
    (meta.model || meta.durationMs != null || meta.totalTokens != null);
  const handleDelete = onDelete ? () => onDelete(id) : undefined;
  const canEdit = isUser && onEditResend && !id.startsWith("local-");

  function startEdit() {
    setDraft(content);
    setIsEditing(true);
  }

  function commitEdit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== content) onEditResend?.(id, trimmed);
    setIsEditing(false);
  }

  return (
    <div className={`group flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {!isError && (
        isUser ? (
          <div className="w-7 h-7 shrink-0 rounded-full bg-secondary flex items-center justify-center select-none">
            <User className="h-3.5 w-3.5 text-secondary-foreground" />
          </div>
        ) : (
          <AgentAvatar avatar={avatar} className="w-7 h-7 text-sm" iconClassName="h-3.5 w-3.5" />
        )
      )}
      {/* 宽度上限必须加在列容器上（百分比参照整行）；
          若加在气泡上，参照物是收缩适应的列容器，会双重收窄 */}
      <div className={`flex min-w-0 max-w-[85%] flex-col ${isUser ? "items-end" : "items-start"} ${isEditing ? "flex-1" : ""}`}>
        {isEditing ? (
          <div className="w-full space-y-2">
            <textarea
              className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commitEdit();
                if (e.key === "Escape") setIsEditing(false);
              }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                {tCommon("cancel")}
              </Button>
              <Button size="sm" onClick={commitEdit} disabled={!draft.trim()}>
                {t("saveAndResend")}
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={`max-w-full rounded-lg px-4 py-2 text-sm ${
              isError
                ? "bg-destructive/10 text-destructive border border-destructive/30 whitespace-pre-wrap"
                : isUser
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
            }`}
          >
            {isError ? (
              content || ""
            ) : isUser ? (
              <MarkdownContent content={content} onPrimary />
            ) : content ? (
              <MarkdownContent content={content} />
            ) : (
              <TypingDots />
            )}
          </div>
        )}
        {attachments && attachments.length > 0 && <MessageAttachments attachments={attachments} />}
        {time && (
          <span className="text-[10px] text-muted-foreground mt-0.5 px-1">{time}</span>
        )}
        {activeSkills && activeSkills.length > 0 && <SkillBadges skills={activeSkills} />}
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
        {role !== "error" && content && !isEditing && (
          <MessageActions
            role={role}
            content={content}
            isLast={isLast}
            onRegenerate={onRegenerate}
            onRegenerateFrom={role === "assistant" && !isLast && onRegenerateFrom ? () => onRegenerateFrom(id) : undefined}
            onDelete={handleDelete}
            onEdit={canEdit ? startEdit : undefined}
            onShowTrace={role === "assistant" ? () => setShowTrace(true) : undefined}
          />
        )}
        {role === "assistant" && (
          <TracePanel messageId={id} open={showTrace} onClose={() => setShowTrace(false)} />
        )}
      </div>
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleImpl);
