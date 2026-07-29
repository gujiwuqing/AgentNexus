"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./message-bubble";
import type { DisplayMessage } from "@/hooks/use-chat-stream";

export function MessageList({
  messages,
  avatar,
  onRegenerate,
  onDelete,
}: {
  messages: DisplayMessage[];
  avatar?: string;
  onRegenerate?: () => void;
  onDelete: (id: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
            isLast={i === messages.length - 1}
            onRegenerate={canRegenerate ? onRegenerate : undefined}
            onDelete={m.id.startsWith("local-") ? undefined : onDelete}
          />
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
