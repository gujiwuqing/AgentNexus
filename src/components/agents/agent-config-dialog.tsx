"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AgentForm } from "@/components/agents/agent-form";
import { useAgent, useUpdateAgent } from "@/hooks/use-agents";
import { exportAgentJson } from "@/lib/export";

export function AgentConfigDialog({
  agentId,
  trigger,
}: {
  agentId: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { data: agent } = useAgent(agentId);
  const updateAgent = useUpdateAgent(agentId);
  const t = useTranslations("agentsExt.configDialog");

  if (!agent) return trigger;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t("configure", { name: agent.name })}</span>
            <Button variant="outline" size="sm" onClick={() => exportAgentJson(agent)}>
              {t("export")}
            </Button>
          </DialogTitle>
        </DialogHeader>
        <AgentForm
          agent={agent}
          submitLabel={t("save")}
          isSubmitting={updateAgent.isPending}
          onSubmit={(values) =>
            updateAgent.mutate(values, { onSuccess: () => setOpen(false) })
          }
        />
        {updateAgent.isError && (
          <p className="text-destructive text-sm">{updateAgent.error.message}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
