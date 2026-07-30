"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TemplatePicker } from "@/components/templates/template-picker";
import { useAgents } from "@/hooks/use-agents";
import { useCreateWorkflow } from "@/hooks/use-workflows";
import { createProfessionalWorkflowTemplates, professionalAgentTemplates } from "@/lib/professional-templates";

export default function NewWorkflowPage() {
  const router = useRouter();
  const { data: agents } = useAgents();
  const createWorkflow = useCreateWorkflow();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTemplateKey, setSelectedTemplateKey] = useState("blank");
  const t = useTranslations("workflows");
  const tTemplate = useTranslations("workflowExt.workflowTemplate");
  const agentIds = Object.fromEntries(
    professionalAgentTemplates.map((template) => [
      template.key,
      agents?.find((agent) => agent.tags.includes(`template:${template.key}`))?.id ?? "",
    ]),
  );
  const workflowTemplates = createProfessionalWorkflowTemplates(agentIds);
  const selectedTemplate = workflowTemplates.find((template) => template.key === selectedTemplateKey);
  const hasRequiredAgents = selectedTemplate?.graph.nodes
    .every((node) => node.type !== "agent" || Boolean((node.config as { agentId?: string }).agentId)) ?? true;
  const templateItems = [
    {
      id: "blank",
      name: t("blank"),
      description: t("blankDescription"),
      icon: "＋",
      output: t("blankDescription"),
    },
    ...workflowTemplates.map((template) => ({
      id: template.key,
      name: template.name,
      description: template.description,
      icon: "⚙️",
      output: template.graph.nodes[template.graph.nodes.length - 1].label,
    })),
  ];

  function handleTemplateSelect(templateKey: string) {
    setSelectedTemplateKey(templateKey);
    const template = workflowTemplates.find((item) => item.key === templateKey);
    setName(template?.name ?? "");
    setDescription(template?.description ?? "");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createWorkflow.mutate(
      { name: name.trim(), description: description.trim(), graph: selectedTemplate && hasRequiredAgents ? selectedTemplate.graph : { nodes: [], edges: [] } },
      { onSuccess: (workflow) => router.push(`/workflows/${workflow.id}/edit`) }
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 lg:px-10 animate-in fade-in duration-300">
      <h1 className="text-2xl font-semibold mb-8">{t("new")}</h1>

      <section className="mb-10 space-y-3">
        <h2 className="text-lg font-semibold">{tTemplate("heading")}</h2>
        <p className="text-sm text-muted-foreground">{tTemplate("description")}</p>
        <TemplatePicker
          items={templateItems}
          selectedId={selectedTemplateKey}
          onSelect={handleTemplateSelect}
        />
        {selectedTemplate && !hasRequiredAgents && (
          <p className="text-destructive text-sm">{tTemplate("missingAgents")}</p>
        )}
      </section>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">{t("name")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t("description")}</Label>
            <Textarea
              id="description"
              rows={1}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
            />
          </div>
        </div>
        <div className="flex items-center gap-4 pt-2 border-t">
          <Button type="submit" disabled={createWorkflow.isPending || !name.trim() || Boolean(selectedTemplate && !hasRequiredAgents)}>
            {createWorkflow.isPending ? t("creating") : t("create")}
          </Button>
        </div>
        {createWorkflow.isError && (
          <p className="text-destructive text-sm">{createWorkflow.error.message}</p>
        )}
      </form>
      <p className="text-sm text-muted-foreground mt-4">{tTemplate("buildHint")}</p>
    </div>
  );
}
