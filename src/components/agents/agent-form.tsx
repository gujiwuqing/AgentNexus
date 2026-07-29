"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Agent, AgentFormValues } from "@/types/agent";
import { AgentToolsConfig } from "@/components/agents/agent-tools-config";

function toFormValues(agent?: Agent): AgentFormValues {
  return {
    name: agent?.name ?? "",
    description: agent?.description ?? "",
    avatar: agent?.avatar ?? "",
    tags: agent?.tags ?? [],
    systemPrompt: agent?.systemPrompt ?? "",
    temperature: agent?.temperature ?? 0.7,
    maxTokens: agent?.maxTokens ?? 1024,
    topP: agent?.topP ?? 1,
    model: agent?.model ?? "",
    memoryWindowSize: agent?.memoryWindowSize ?? 20,
    toolsConfig: (agent?.toolsConfig as { enabledTools: string[] }) ?? { enabledTools: [] },
  };
}

export function toInitialAgentFormValues(agent?: Agent, initialValues?: AgentFormValues) {
  return initialValues ?? toFormValues(agent);
}

export function AgentForm({
  agent,
  initialValues,
  onSubmit,
  submitLabel,
  isSubmitting,
}: {
  agent?: Agent;
  initialValues?: AgentFormValues;
  onSubmit: (values: AgentFormValues) => void;
  submitLabel: string;
  isSubmitting: boolean;
}) {
  const [values, setValues] = useState<AgentFormValues>(() => toInitialAgentFormValues(agent, initialValues));
  const t = useTranslations("agentsExt.form");

  function update<K extends keyof AgentFormValues>(key: K, value: AgentFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = (values.model ?? "").trim();
    onSubmit({ ...values, model: trimmed === "" ? null : trimmed });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">{t("name")}</Label>
            <Input id="name" value={values.name} onChange={(e) => update("name", e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("description")}</Label>
            <Input id="description" value={values.description} onChange={(e) => update("description", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="avatar">{t("avatar")}</Label>
              <Input id="avatar" value={values.avatar} onChange={(e) => update("avatar", e.target.value)} placeholder="🤖" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">{t("model")}</Label>
              <Input
                id="model"
                value={values.model ?? ""}
                onChange={(e) => update("model", e.target.value)}
                placeholder={t("modelPlaceholder")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">{t("tags")}</Label>
            <Input
              id="tags"
              value={values.tags.join(", ")}
              onChange={(e) =>
                update(
                  "tags",
                  e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                )
              }
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="temperature">{t("temperature")}</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                min={0}
                max={2}
                required
                value={values.temperature}
                onChange={(e) => {
                  if (e.target.value === "") return;
                  const parsed = Number(e.target.value);
                  if (!Number.isNaN(parsed)) update("temperature", parsed);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxTokens">{t("maxTokens")}</Label>
              <Input
                id="maxTokens"
                type="number"
                min={1}
                required
                value={values.maxTokens}
                onChange={(e) => {
                  if (e.target.value === "") return;
                  const parsed = Number(e.target.value);
                  if (!Number.isNaN(parsed)) update("maxTokens", parsed);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topP">{t("topP")}</Label>
              <Input
                id="topP"
                type="number"
                step="0.05"
                min={0}
                max={1}
                required
                value={values.topP}
                onChange={(e) => {
                  if (e.target.value === "") return;
                  const parsed = Number(e.target.value);
                  if (!Number.isNaN(parsed)) update("topP", parsed);
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="memoryWindowSize">{t("memoryWindowSize")}</Label>
            <Input
              id="memoryWindowSize"
              type="number"
              min={0}
              max={200}
              required
              value={values.memoryWindowSize}
              onChange={(e) => {
                if (e.target.value === "") return;
                const parsed = Number(e.target.value);
                if (!Number.isNaN(parsed)) update("memoryWindowSize", parsed);
              }}
            />
            <p className="text-xs text-muted-foreground">{t("memoryWindowSizeHint")}</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="systemPrompt">{t("systemPrompt")}</Label>
          <Textarea
            id="systemPrompt"
            className="min-h-[320px] lg:min-h-[400px] resize-y"
            value={values.systemPrompt}
            onChange={(e) => update("systemPrompt", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <AgentToolsConfig
            enabledTools={values.toolsConfig?.enabledTools ?? []}
            onChange={(tools) => update("toolsConfig", { ...values.toolsConfig, enabledTools: tools })}
          />
        </div>
      </div>

      <div className="flex items-center gap-4 pt-2 border-t">
        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
