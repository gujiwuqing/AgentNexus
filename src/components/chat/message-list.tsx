"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./message-bubble";
import type { DisplayMessage } from "@/hooks/use-chat-stream";

export function MessageList({
  messages,
  avatar,
  onRegenerate,
  onDelete,
  onEditResend,
}: {
  messages: DisplayMessage[];
  avatar?: string;
  onRegenerate?: () => void;
  onDelete: (id: string) => void;
  onEditResend?: (id: string, content: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* 内容列限宽居中，超宽屏下保持可读行宽 */}
      <div className="mx-auto w-full max-w-3xl space-y-3">
        {messages.map((m, i) => {
          const canRegenerate =
            m.role === "assistant" &&
            i === messages.length - 1 &&
            i > 0 &&
            messages[i - 1].role === "user";
          return (
            <MessageBubble
              key={m.id}
              id={m.id}
              role={m.role}
              content={m.content}
              createdAt={m.createdAt}
              avatar={avatar}
              meta={m.meta}
              attachments={m.attachments}
              toolCalls={m.toolCalls}
              activeSkills={m.activeSkills}
              isLast={i === messages.length - 1}
              onRegenerate={canRegenerate ? onRegenerate : undefined}
              onDelete={m.id.startsWith("local-") ? undefined : onDelete}
              onEditResend={onEditResend}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
