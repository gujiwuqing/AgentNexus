"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { MessageList } from "@/components/chat/message-list";
import { ChatInput } from "@/components/chat/chat-input";
import { ShareDialog } from "@/components/chat/share-dialog";
import { useChatStream } from "@/hooks/use-chat-stream";
import { useConversationDetail } from "@/hooks/use-conversations";
import { useAgent } from "@/hooks/use-agents";
import { exportConversationMarkdown } from "@/lib/export";

export default function ChatConversationPage() {
  const { agentId, conversationId } = useParams<{ agentId: string; conversationId: string }>();
  const { data: agent } = useAgent(agentId);
  const { messages, isLoading, isStreaming, sendMessage, regenerate, deleteMessage, stop } = useChatStream(
    conversationId,
    agent?.model ?? null
  );
  const { data: detail } = useConversationDetail(conversationId);
  const t = useTranslations("chat");
  const tCommon = useTranslations("common");

  if (isLoading) return <div className="p-8">{tCommon("loading")}</div>;

  function handleExport() {
    if (!detail || !agent) return;
    exportConversationMarkdown(detail.conversation.title, agent.name, detail.messages);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <span className="text-sm font-medium truncate">{detail?.conversation.title ?? ""}</span>
        <div className="flex items-center gap-1">
          <ShareDialog conversationId={conversationId} />
          <Button variant="ghost" size="sm" onClick={handleExport} disabled={!detail}>
            {t("export")}
          </Button>
        </div>
      </div>
      <MessageList
        messages={messages}
        avatar={agent?.avatar}
        onRegenerate={regenerate}
        onDelete={deleteMessage}
      />
      <ChatInput onSend={sendMessage} onStop={stop} disabled={isStreaming} />
    </div>
  );
}
