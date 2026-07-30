"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToolParametersEditor } from "@/components/tools/tool-parameters-editor";
import type { CustomTool, CustomToolFormValues, HttpToolConfig, PromptToolConfig } from "@/types/custom-tool";

const DEFAULT_HTTP_CONFIG: HttpToolConfig = {
  url: "",
  method: "GET",
  headers: undefined,
  bodyTemplate: undefined,
  queryTemplate: undefined,
};

const DEFAULT_PROMPT_CONFIG: PromptToolConfig = {
  systemInstruction: "",
  outputFormat: undefined,
};

function toFormValues(tool?: CustomTool): CustomToolFormValues {
  return {
    name: tool?.name ?? "",
    displayName: tool?.displayName ?? "",
    description: tool?.description ?? "",
    icon: tool?.icon ?? "",
    tags: tool?.tags ?? [],
    type: tool?.type ?? "http",
    httpConfig: tool?.httpConfig ?? { ...DEFAULT_HTTP_CONFIG },
    promptConfig: tool?.promptConfig ?? { ...DEFAULT_PROMPT_CONFIG },
    parameters: tool?.parameters ?? [],
  };
}

export function ToolForm({
  tool,
  onSubmit,
  onCancel,
  submitLabel,
  isSubmitting,
}: {
  tool?: CustomTool;
  onSubmit: (values: CustomToolFormValues) => void;
  onCancel?: () => void;
  submitLabel: string;
  isSubmitting: boolean;
}) {
  const [values, setValues] = useState<CustomToolFormValues>(() => toFormValues(tool));
  const [baseline, setBaseline] = useState(() => JSON.stringify(toFormValues(tool)));
  const isDirty = JSON.stringify(values) !== baseline;
  const t = useTranslations("customTools.form");
  const tCommon = useTranslations("common");

  function update<K extends keyof CustomToolFormValues>(key: K, value: CustomToolFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function updateHttpConfig<K extends keyof HttpToolConfig>(key: K, value: HttpToolConfig[K]) {
    setValues((prev) => ({
      ...prev,
      httpConfig: { ...(prev.httpConfig ?? DEFAULT_HTTP_CONFIG), [key]: value },
    }));
  }

  function updatePromptConfig<K extends keyof PromptToolConfig>(key: K, value: PromptToolConfig[K]) {
    setValues((prev) => ({
      ...prev,
      promptConfig: { ...(prev.promptConfig ?? DEFAULT_PROMPT_CONFIG), [key]: value },
    }));
  }

  function switchType(newType: "http" | "prompt") {
    setValues((prev) => ({
      ...prev,
      type: newType,
      httpConfig: newType === "http" ? (prev.httpConfig ?? { ...DEFAULT_HTTP_CONFIG }) : null,
      promptConfig: newType === "prompt" ? (prev.promptConfig ?? { ...DEFAULT_PROMPT_CONFIG }) : null,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const submitted: CustomToolFormValues = {
      ...values,
      httpConfig: values.type === "http" ? values.httpConfig : null,
      promptConfig: values.type === "prompt" ? values.promptConfig : null,
    };
    onSubmit(submitted);
    setBaseline(JSON.stringify(values));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
        {/* Left column: basic info */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">{t("name")}</Label>
            <Input
              id="name"
              value={values.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="weather_query"
              required
            />
            <p className="text-xs text-muted-foreground">{t("nameHint")}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">{t("displayName")}</Label>
            <Input
              id="displayName"
              value={values.displayName}
              onChange={(e) => update("displayName", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("description")}</Label>
            <Textarea
              id="description"
              className="min-h-[80px] resize-y"
              value={values.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="icon">{t("icon")}</Label>
              <Input
                id="icon"
                value={values.icon}
                onChange={(e) => update("icon", e.target.value)}
                placeholder="🔧"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">{t("tags")}</Label>
              <Input
                id="tags"
                value={values.tags.join(", ")}
                onChange={(e) =>
                  update(
                    "tags",
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  )
                }
                placeholder={t("tagsPlaceholder")}
              />
            </div>
          </div>

          {/* Tool type selector */}
          <div className="space-y-2">
            <Label>{t("type")}</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={values.type === "http" ? "default" : "outline"}
                size="sm"
                onClick={() => switchType("http")}
              >
                HTTP
              </Button>
              <Button
                type="button"
                variant={values.type === "prompt" ? "default" : "outline"}
                size="sm"
                onClick={() => switchType("prompt")}
              >
                Prompt
              </Button>
            </div>
          </div>
        </div>

        {/* Right column: type-specific config + parameters */}
        <div className="space-y-6">
          {/* HTTP config */}
          {values.type === "http" && (
            <fieldset className="space-y-4 border rounded-lg p-4">
              <legend className="text-sm font-medium px-1">{t("httpConfig")}</legend>

              <div className="space-y-2">
                <Label htmlFor="httpUrl">{t("httpUrl")}</Label>
                <Input
                  id="httpUrl"
                  value={values.httpConfig?.url ?? ""}
                  onChange={(e) => updateHttpConfig("url", e.target.value)}
                  placeholder="https://api.example.com/endpoint"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="httpMethod">{t("httpMethod")}</Label>
                <Select
                  value={values.httpConfig?.method ?? "GET"}
                  onValueChange={(v) => updateHttpConfig("method", v as HttpToolConfig["method"])}
                >
                  <SelectTrigger id="httpMethod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="httpHeaders">{t("httpHeaders")}</Label>
                <Textarea
                  id="httpHeaders"
                  className="min-h-[60px] resize-y font-mono text-xs"
                  value={
                    values.httpConfig?.headers
                      ? JSON.stringify(values.httpConfig.headers, null, 2)
                      : ""
                  }
                  onChange={(e) => {
                    try {
                      const parsed = e.target.value.trim() ? JSON.parse(e.target.value) : undefined;
                      updateHttpConfig("headers", parsed);
                    } catch {
                      // allow invalid JSON while typing
                    }
                  }}
                  placeholder='{"Authorization": "Bearer ..."}'
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="httpBody">{t("httpBodyTemplate")}</Label>
                <Textarea
                  id="httpBody"
                  className="min-h-[60px] resize-y font-mono text-xs"
                  value={values.httpConfig?.bodyTemplate ?? ""}
                  onChange={(e) => updateHttpConfig("bodyTemplate", e.target.value || undefined)}
                  placeholder='{"query": "{{input}}"}'
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="httpQuery">{t("httpQueryTemplate")}</Label>
                <Textarea
                  id="httpQuery"
                  className="min-h-[60px] resize-y font-mono text-xs"
                  value={
                    values.httpConfig?.queryTemplate
                      ? JSON.stringify(values.httpConfig.queryTemplate, null, 2)
                      : ""
                  }
                  onChange={(e) => {
                    try {
                      const parsed = e.target.value.trim() ? JSON.parse(e.target.value) : undefined;
                      updateHttpConfig("queryTemplate", parsed);
                    } catch {
                      // allow invalid JSON while typing
                    }
                  }}
                  placeholder='{"q": "{{input}}"}'
                />
              </div>
            </fieldset>
          )}

          {/* Prompt config */}
          {values.type === "prompt" && (
            <fieldset className="space-y-4 border rounded-lg p-4">
              <legend className="text-sm font-medium px-1">{t("promptConfig")}</legend>

              <div className="space-y-2">
                <Label htmlFor="systemInstruction">{t("systemInstruction")}</Label>
                <Textarea
                  id="systemInstruction"
                  className="min-h-[120px] resize-y"
                  value={values.promptConfig?.systemInstruction ?? ""}
                  onChange={(e) => updatePromptConfig("systemInstruction", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="outputFormat">{t("outputFormat")}</Label>
                <Input
                  id="outputFormat"
                  value={values.promptConfig?.outputFormat ?? ""}
                  onChange={(e) => updatePromptConfig("outputFormat", e.target.value || undefined)}
                  placeholder="json"
                />
              </div>
            </fieldset>
          )}

          {/* Parameters */}
          <ToolParametersEditor
            parameters={values.parameters}
            onChange={(params) => update("parameters", params)}
          />
        </div>
      </div>

      {/* Sticky submit bar */}
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
