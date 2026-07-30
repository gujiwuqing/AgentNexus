"use client";

import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ToolParameter } from "@/types/custom-tool";

export function ToolParametersEditor({
  parameters,
  onChange,
}: {
  parameters: ToolParameter[];
  onChange: (parameters: ToolParameter[]) => void;
}) {
  const t = useTranslations("customTools.form");

  function addParameter() {
    onChange([...parameters, { name: "", type: "string", description: "", required: true }]);
  }

  function removeParameter(index: number) {
    onChange(parameters.filter((_, i) => i !== index));
  }

  function updateParameter(index: number, field: keyof ToolParameter, value: unknown) {
    const updated = parameters.map((p, i) => i === index ? { ...p, [field]: value } : p);
    onChange(updated);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{t("parameters")}</Label>
        <Button type="button" variant="outline" size="sm" onClick={addParameter}>
          <Plus className="h-3 w-3 mr-1" />
          {t("addParameter")}
        </Button>
      </div>
      {parameters.map((param, i) => (
        <div key={i} className="relative border rounded-lg p-3 space-y-2">
          <button
            type="button"
            onClick={() => removeParameter(i)}
            className="absolute top-2 right-2 p-1 rounded hover:bg-muted text-muted-foreground"
          >
            <X className="h-3 w-3" />
          </button>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">{t("paramName")}</Label>
              <Input
                value={param.name}
                onChange={(e) => updateParameter(i, "name", e.target.value)}
                placeholder="city"
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("paramType")}</Label>
              <select
                value={param.type}
                onChange={(e) => updateParameter(i, "type", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("paramDescription")}</Label>
            <Input
              value={param.description}
              onChange={(e) => updateParameter(i, "description", e.target.value)}
              placeholder="City name"
              className="text-sm"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={param.required}
                onChange={(e) => updateParameter(i, "required", e.target.checked)}
                className="rounded border-input"
              />
              {t("paramRequired")}
            </label>
            <div className="flex-1">
              <Input
                value={param.default !== undefined ? String(param.default) : ""}
                onChange={(e) => updateParameter(i, "default", e.target.value || undefined)}
                placeholder={t("paramDefault")}
                className="text-sm h-7"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
