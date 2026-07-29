import { notFound } from "next/navigation";
import { getShareByToken } from "@/server/conversation-shares";
import { getConversationById } from "@/server/conversations";
import { listMessages } from "@/server/messages";
import { getAgent } from "@/server/agents";
import { ReadOnlyMessageList } from "@/components/chat/read-only-message-list";

type Props = { params: Promise<{ token: string }> };

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const share = await getShareByToken(token);
  if (!share) notFound();

  const conversation = await getConversationById(share.conversationId);
  if (!conversation) notFound();

  const agent = await getAgent(conversation.agentId);
  const messages = await listMessages(share.conversationId);

  const displayMessages = messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: new Date(m.createdAt as unknown as string).toISOString(),
    attachments: (m as Record<string, unknown>).attachments as Array<{ id: string; filename: string; mimetype: string; size: number }> | null,
  }));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <span className="text-2xl">{agent?.avatar || "🤖"}</span>
          <div>
            <h1 className="font-semibold">{conversation.title}</h1>
            <p className="text-sm text-muted-foreground">{agent?.name ?? "Agent"}</p>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8">
        <ReadOnlyMessageList messages={displayMessages} />
      </main>
    </div>
  );
}
