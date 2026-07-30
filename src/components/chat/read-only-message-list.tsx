"use client";

import { MarkdownView } from "@/components/markdown/markdown-view";
import { MessageAttachments } from "@/components/chat/message-attachments";

type ShareMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  attachments: Array<{ id: string; filename: string; mimetype: string; size: number }> | null;
};

export function ReadOnlyMessageList({ messages }: { messages: ShareMessage[] }) {
  return (
    <div className="space-y-6">
      {messages
        .filter((m) => m.role !== "system")
        .map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-4 py-3 ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <MarkdownView
                content={m.content}
                size="sm"
                className={m.role === "user" ? "prose-on-primary" : undefined}
              />
              {m.attachments && m.attachments.length > 0 && (
                <MessageAttachments attachments={m.attachments} />
              )}
              <p className="text-xs opacity-60 mt-2">
                {new Date(m.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
    </div>
  );
}
