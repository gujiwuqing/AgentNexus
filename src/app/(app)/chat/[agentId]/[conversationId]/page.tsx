"use client";

import { useRef } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { MessageList } from "@/components/chat/message-list";
import { ChatInput, type ChatInputHandle } from "@/components/chat/chat-input";
import { ChatWelcome } from "@/components/chat/chat-welcome";
import { ShareDialog } from "@/components/chat/share-dialog";
import { ChatSkeleton } from "@/components/ui/page-skeleton";
import { useChatStream } from "@/hooks/use-chat-stream";
import { useConversationDetail } from "@/hooks/use-conversations";
import { useAgent } from "@/hooks/use-agents";
import { exportConversationMarkdown } from "@/lib/export";

export default function ChatConversationPage() {
  const { agentId, conversationId } = useParams<{ agentId: string; conversationId: string }>();
  const { data: agent } = useAgent(agentId);
  const { messages, isLoading, isStreaming, sendMessage, regenerate, deleteMessage, editAndResend, stop } = useChatStream(
    conversationId,
    agent?.model ?? null
  );
  const { data: detail } = useConversationDetail(conversationId);
  const inputRef = useRef<ChatInputHandle>(null);
  const t = useTranslations("chat");

  if (isLoading) return <ChatSkeleton />;

  function handleExport() {
    if (!detail || !agent) return;
    exportConversationMarkdown(detail.conversation.title, agent.name, detail.messages);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 pl-12 md:pl-4 border-b">
        <span className="text-sm font-medium truncate">{detail?.conversation.title ?? ""}</span>
        <div className="flex items-center gap-1">
          <ShareDialog conversationId={conversationId} />
          <Button variant="ghost" size="sm" onClick={handleExport} disabled={!detail}>
            {t("export")}
          </Button>
        </div>
      </div>
      {messages.length === 0 ? (
        // 建议问题只填入输入框，由用户补充具体内容后再发送
        <ChatWelcome agent={agent} onSelectPrompt={(prompt) => inputRef.current?.fill(prompt)} />
      ) : (
        <MessageList
          messages={messages}
          avatar={agent?.avatar}
          onRegenerate={regenerate}
          onDelete={deleteMessage}
          onEditResend={isStreaming ? undefined : editAndResend}
        />
      )}
      <ChatInput ref={inputRef} onSend={sendMessage} onStop={stop} disabled={isStreaming} />
    </div>
  );
}
