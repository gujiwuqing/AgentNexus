"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AgentForm } from "@/components/agents/agent-form";
import { TemplatePicker } from "@/components/templates/template-picker";
import { useCreateAgent } from "@/hooks/use-agents";
import { professionalAgentTemplates, toAgentFormValues } from "@/lib/professional-templates";

export default function NewAgentPage() {
  const router = useRouter();
  const createAgent = useCreateAgent();
  const t = useTranslations("agents");
  const tTemplatePicker = useTranslations("agentsExt.templatePicker");
  const [selectedTemplateKey, setSelectedTemplateKey] = useState("blank");
  const selectedTemplate = professionalAgentTemplates.find((template) => template.key === selectedTemplateKey);

  const templateItems = [
    {
      id: "blank",
      name: tTemplatePicker("blank"),
      description: tTemplatePicker("blankDescription"),
      icon: "＋",
      output: tTemplatePicker("blankDescription"),
    },
    ...professionalAgentTemplates.map((template) => ({
      id: template.key,
      name: template.name,
      description: template.description,
      icon: template.avatar,
      output: template.output,
    })),
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 lg:px-10 animate-in fade-in duration-300">
      <h1 className="text-2xl font-semibold mb-8">{t("new")}</h1>
      <section className="mb-10 space-y-3">
        <h2 className="text-lg font-semibold">{tTemplatePicker("heading")}</h2>
        <p className="text-sm text-muted-foreground">{tTemplatePicker("description")}</p>
        <TemplatePicker
          items={templateItems}
          selectedId={selectedTemplateKey}
          onSelect={setSelectedTemplateKey}
        />
      </section>
      <AgentForm
        key={selectedTemplateKey}
        initialValues={selectedTemplate ? toAgentFormValues(selectedTemplate) : undefined}
        submitLabel={t("create")}
        isSubmitting={createAgent.isPending}
        onSubmit={(values) =>
          createAgent.mutate(values, {
            onSuccess: (agent) => router.push(`/agents/${agent.id}`),
          })
        }
      />
      {createAgent.isError && <p className="text-destructive mt-4">{createAgent.error.message}</p>}
    </div>
  );
}
