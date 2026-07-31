"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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
    memoryStrategy: agent?.memoryStrategy ?? "window",
    toolsConfig: (agent?.toolsConfig as { enabledTools: string[] }) ?? { enabledTools: [] },
    suggestedPrompts: agent?.suggestedPrompts ?? [],
  };
}

export function toInitialAgentFormValues(agent?: Agent, initialValues?: AgentFormValues) {
  return initialValues ?? toFormValues(agent);
}

export function AgentForm({
  agent,
  initialValues,
  onSubmit,
  onCancel,
  submitLabel,
  isSubmitting,
}: {
  agent?: Agent;
  initialValues?: AgentFormValues;
  onSubmit: (values: AgentFormValues) => void;
  onCancel?: () => void;
  submitLabel: string;
  isSubmitting: boolean;
}) {
  const [values, setValues] = useState<AgentFormValues>(() => toInitialAgentFormValues(agent, initialValues));
  // 快照初始值用于脏检查，提交后重置基准
  const [baseline, setBaseline] = useState(() => JSON.stringify(toInitialAgentFormValues(agent, initialValues)));
  const isDirty = JSON.stringify(values) !== baseline;
  const t = useTranslations("agentsExt.form");
  const tCommon = useTranslations("common");

  function update<K extends keyof AgentFormValues>(key: K, value: AgentFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = (values.model ?? "").trim();
    onSubmit({
      ...values,
      model: trimmed === "" ? null : trimmed,
      // 编辑态保留空行方便输入，提交时再清洗
      suggestedPrompts: values.suggestedPrompts.map((s) => s.trim()).filter(Boolean).slice(0, 4),
    });
    setBaseline(JSON.stringify(values));
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="temperature">{t("temperature")}</Label>
              <span className="text-sm tabular-nums text-muted-foreground">{values.temperature.toFixed(1)}</span>
            </div>
            <Slider
              id="temperature"
              min={0}
              max={2}
              step={0.1}
              value={values.temperature}
              onChange={(e) => update("temperature", Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">{t("temperatureHint")}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="topP">{t("topP")}</Label>
              <span className="text-sm tabular-nums text-muted-foreground">{values.topP.toFixed(2)}</span>
            </div>
            <Slider
              id="topP"
              min={0}
              max={1}
              step={0.05}
              value={values.topP}
              onChange={(e) => update("topP", Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">{t("topPHint")}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-3">{t("memoryWindowSizeHint")}</p>

          <div className="space-y-2">
            <Label>{t("memoryStrategy")}</Label>
            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="memoryStrategy"
                  value="window"
                  checked={values.memoryStrategy === "window"}
                  onChange={() => update("memoryStrategy", "window")}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-medium">{t("memoryStrategyWindow")}</p>
                  <p className="text-xs text-muted-foreground">{t("memoryStrategyWindowHint")}</p>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="memoryStrategy"
                  value="summary_window"
                  checked={values.memoryStrategy === "summary_window"}
                  onChange={() => update("memoryStrategy", "summary_window")}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-medium">{t("memoryStrategySummary")}</p>
                  <p className="text-xs text-muted-foreground">{t("memoryStrategySummaryHint")}</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">{t("systemPrompt")}</Label>
            <Textarea
              id="systemPrompt"
              className="min-h-[280px] lg:min-h-[320px] resize-y"
              value={values.systemPrompt}
              onChange={(e) => update("systemPrompt", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="suggestedPrompts">{t("suggestedPrompts")}</Label>
            <Textarea
              id="suggestedPrompts"
              rows={4}
              className="resize-y"
              placeholder={t("suggestedPromptsPlaceholder")}
              value={values.suggestedPrompts.join("\n")}
              onChange={(e) => update("suggestedPrompts", e.target.value.split("\n"))}
            />
            <p className="text-xs text-muted-foreground">{t("suggestedPromptsHint")}</p>
          </div>
        </div>

        <div className="space-y-2">
          <AgentToolsConfig
            enabledTools={values.toolsConfig?.enabledTools ?? []}
            onChange={(tools) => update("toolsConfig", { ...values.toolsConfig, enabledTools: tools })}
          />
        </div>
      </div>

      {/* 吸底操作栏：长表单滚动中保存按钮始终可见，按表单惯例右对齐 */}
      <div className="sticky bottom-0 -mx-1 px-1 flex items-center justify-end gap-3 border-t bg-background/95 py-3 backdrop-blur">
        {isDirty && !isSubmitting && (
          <span className="text-xs text-muted-foreground">{t("unsavedChanges")}</span>
        )}
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {tCommon("cancel")}
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
