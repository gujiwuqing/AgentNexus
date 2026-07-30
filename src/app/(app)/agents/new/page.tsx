"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AgentForm } from "@/components/agents/agent-form";
import { TemplatePicker } from "@/components/templates/template-picker";
import { useCreateAgent } from "@/hooks/use-agents";
import { professionalAgentTemplates, toAgentFormValues } from "@/lib/professional-templates";

export default function NewAgentPage() {
  const router = useRouter();
  const createAgent = useCreateAgent();
  const t = useTranslations("agents");
  const tTemplatePicker = useTranslations("agentsExt.templatePicker");
  // 两步式：先选模板，再编辑表单，避免单页信息过载
  const [step, setStep] = useState<"template" | "form">("template");
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

  const selectedItem = templateItems.find((item) => item.id === selectedTemplateKey);

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 lg:px-10 animate-in fade-in duration-300">
      <h1 className="text-2xl font-semibold mb-8">{t("new")}</h1>

      {step === "template" ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{tTemplatePicker("heading")}</h2>
          <p className="text-sm text-muted-foreground">{tTemplatePicker("stepHint")}</p>
          <TemplatePicker
            items={templateItems}
            selectedId={selectedTemplateKey}
            onSelect={(id) => {
              setSelectedTemplateKey(id);
              setStep("form");
            }}
          />
        </section>
      ) : (
        <>
          <div className="mb-6 flex items-center gap-3">
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setStep("template")}>
              <ArrowLeft className="h-3.5 w-3.5" />
              {tTemplatePicker("reselect")}
            </Button>
            {selectedItem && (
              <span className="text-sm text-muted-foreground">
                {selectedItem.icon} {selectedItem.name}
              </span>
            )}
          </div>
          <AgentForm
            key={selectedTemplateKey}
            initialValues={selectedTemplate ? toAgentFormValues(selectedTemplate) : undefined}
            submitLabel={t("create")}
            isSubmitting={createAgent.isPending}
            onCancel={() => router.push("/agents")}
            onSubmit={(values) =>
              createAgent.mutate(values, {
                onSuccess: (agent) => router.push(`/agents/${agent.id}`),
                onError: (err) => toast.error(err.message),
              })
            }
          />
        </>
      )}
    </div>
  );
}
