"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AgentForm } from "@/components/agents/agent-form";
import { useAgent, useUpdateAgent } from "@/hooks/use-agents";
import { Button } from "@/components/ui/button";
import { PageFormSkeleton } from "@/components/ui/page-skeleton";
import { DeleteAgentButton } from "@/components/agents/delete-agent-button";
import { AgentKnowledgeConfig } from "@/components/agents/agent-knowledge-config";
import { AgentTeamConfig } from "@/components/agents/agent-team-config";
import { Breadcrumb } from "@/components/nav/breadcrumb";

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: agent, isLoading } = useAgent(id);
  const updateAgent = useUpdateAgent(id);
  const t = useTranslations("agents");

  if (isLoading) return <PageFormSkeleton />;
  if (!agent) return <div className="p-8">{t("notFound")}</div>;

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 lg:px-10 animate-in fade-in duration-300">
      <Breadcrumb items={[{ label: t("title"), href: "/agents" }, { label: agent.name }]} />
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">{agent.name}</h1>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link href={`/chat/${agent.id}`}>{t("chat")}</Link>
          </Button>
          <DeleteAgentButton agentId={agent.id} />
        </div>
      </div>
      <AgentForm
        agent={agent}
        submitLabel={t("saveChanges")}
        isSubmitting={updateAgent.isPending}
        onCancel={() => router.push("/agents")}
        // 保存反馈走 toast：原先的行内绿字位于吸底操作栏之下，既容易被忽略又不会消失
        onSubmit={(values) =>
          updateAgent.mutate(values, {
            onSuccess: () => toast.success(t("saved")),
            onError: (err) => toast.error(err.message),
          })
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6 mt-8 pt-8 border-t">
        <AgentKnowledgeConfig agentId={agent.id} />
        <AgentTeamConfig agentId={agent.id} />
      </div>
    </div>
  );
}
