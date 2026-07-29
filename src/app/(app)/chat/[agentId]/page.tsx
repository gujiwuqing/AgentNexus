"use client";

import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useAgent } from "@/hooks/use-agents";
import { useCreateConversation } from "@/hooks/use-conversations";

export default function AgentChatIndexPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const router = useRouter();
  const { data: agent, isLoading } = useAgent(agentId);
  const createConversation = useCreateConversation(agentId);
  const t = useTranslations("agents");
  const tc = useTranslations("chat");
  const tCommon = useTranslations("common");

  if (isLoading) return <div className="p-8">{tCommon("loading")}</div>;
  if (!agent) return <div className="p-8">{t("notFound")}</div>;

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center space-y-3 max-w-sm">
        <div className="text-4xl">{agent.avatar || "🤖"}</div>
        <h2 className="text-lg font-semibold">{agent.name}</h2>
        {agent.description && (
          <p className="text-sm text-muted-foreground">{agent.description}</p>
        )}
        <Button
          disabled={createConversation.isPending}
          onClick={() =>
            createConversation.mutate(undefined, {
              onSuccess: (conv) => router.push(`/chat/${agentId}/${conv.id}`),
            })
          }
        >
          {tc("startConversation")}
        </Button>
      </div>
    </div>
  );
}
