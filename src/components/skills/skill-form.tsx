"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useCustomTools } from "@/hooks/use-custom-tools";
import type { Skill, SkillFormValues, SkillResource } from "@/types/skill";

function toFormValues(skill?: Skill): SkillFormValues {
  return {
    name: skill?.name ?? "",
    description: skill?.description ?? "",
    icon: skill?.icon ?? "",
    tags: skill?.tags ?? [],
    category: skill?.category ?? "",
    version: skill?.version ?? "1.0.0",
    argumentHint: skill?.argumentHint ?? "",
    content: skill?.content ?? "",
    resources: skill?.resources ?? [],
    allowedTools: skill?.allowedTools ?? [],
  };
}

export function SkillForm({
  skill,
  onSubmit,
  onCancel,
  submitLabel,
  isSubmitting,
}: {
  skill?: Skill;
  onSubmit: (values: SkillFormValues) => void;
  onCancel?: () => void;
  submitLabel: string;
  isSubmitting: boolean;
}) {
  const [values, setValues] = useState<SkillFormValues>(() => toFormValues(skill));
  const [baseline] = useState(() => JSON.stringify(toFormValues(skill)));
  const isDirty = JSON.stringify(values) !== baseline;
  const t = useTranslations("skills.form");
  const tCommon = useTranslations("common");
  const tCat = useTranslations("skills.categories");

  function update<K extends keyof SkillFormValues>(key: K, value: SkillFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 flex gap-6 min-h-0">
        {/* 左侧：Markdown 文档编辑器（主体） */}
        <div className="flex-[2] flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium">{t("content")}</Label>
            <span className="text-xs text-muted-foreground">{t("contentHint")}</span>
          </div>
          <Textarea
            className="flex-1 min-h-[600px] resize-y font-mono text-sm leading-relaxed"
            placeholder={"# Skill Name\n\n## 说明\n\n描述这个技能的用途和触发场景...\n\n## 工作流程\n\n### Step 1: ...\n\n### Step 2: ...\n\n## 输出格式\n\n..."}
            value={values.content}
            onChange={(e) => update("content", e.target.value)}
            required
          />
        </div>

        {/* 右侧：元数据面板 */}
        <div className="w-72 shrink-0 space-y-4 border-l pl-6">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{t("metadata")}</h3>

          <div className="space-y-1.5">
            <Label className="text-xs">{t("name")}</Label>
            <Input
              value={values.name}
              onChange={(e) => update("name", e.target.value)}
              required
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t("description")}</Label>
            <Textarea
              rows={2}
              value={values.description}
              onChange={(e) => update("description", e.target.value)}
              className="text-sm resize-none"
              placeholder="简要描述触发场景和用途..."
            />
            <p className="text-[11px] text-muted-foreground">{t("descriptionHint")}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("icon")}</Label>
              <Input
                value={values.icon}
                onChange={(e) => update("icon", e.target.value)}
                placeholder="📝"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("version")}</Label>
              <Input
                value={values.version}
                onChange={(e) => update("version", e.target.value)}
                placeholder="1.0.0"
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t("category")}</Label>
            <select
              value={values.category}
              onChange={(e) => update("category", e.target.value)}
              className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">{tCat("other")}</option>
              <option value="development">{tCat("development")}</option>
              <option value="writing">{tCat("writing")}</option>
              <option value="analysis">{tCat("analysis")}</option>
              <option value="communication">{tCat("communication")}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t("tags")}</Label>
            <Input
              value={values.tags.join(", ")}
              onChange={(e) => update("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              placeholder="开发, 代码质量"
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t("argumentHint")}</Label>
            <Input
              value={values.argumentHint}
              onChange={(e) => update("argumentHint", e.target.value)}
              placeholder="<PRD链接 / 代码路径>"
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t("resources")}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 text-[11px] px-2"
                onClick={() => update("resources", [...values.resources, { title: "", content: "" }])}
              >
                <Plus className="h-3 w-3 mr-1" />
                {t("addResource")}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">{t("resourcesHint")}</p>
            {values.resources.map((resource, i) => (
              <div key={i} className="relative border rounded-md p-2 space-y-1.5">
                <button
                  type="button"
                  onClick={() => update("resources", values.resources.filter((_, idx) => idx !== i))}
                  className="absolute top-1.5 right-1.5 p-0.5 rounded hover:bg-muted text-muted-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
                <Input
                  value={resource.title}
                  onChange={(e) => {
                    const next = values.resources.map((r, idx): SkillResource => idx === i ? { ...r, title: e.target.value } : r);
                    update("resources", next);
                  }}
                  placeholder={t("resourceTitle")}
                  className="h-7 text-xs"
                />
                <Textarea
                  rows={3}
                  value={resource.content}
                  onChange={(e) => {
                    const next = values.resources.map((r, idx): SkillResource => idx === i ? { ...r, content: e.target.value } : r);
                    update("resources", next);
                  }}
                  placeholder={t("resourceContent")}
                  className="text-xs resize-y font-mono"
                />
              </div>
            ))}
          </div>

          <AllowedToolsField
            selected={values.allowedTools}
            onChange={(next) => update("allowedTools", next)}
          />
        </div>
      </div>

      {/* 吸底操作栏 */}
      <div className="sticky bottom-0 -mx-1 px-1 flex items-center justify-end gap-3 border-t bg-background/95 py-3 backdrop-blur mt-4">
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

function AllowedToolsField({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const t = useTranslations("skills.form");
  const { data: allTools } = useCustomTools();

  function toggle(toolName: string) {
    onChange(
      selected.includes(toolName)
        ? selected.filter((n) => n !== toolName)
        : [...selected, toolName],
    );
  }

  if (!allTools || allTools.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{t("allowedTools")}</Label>
      <p className="text-[11px] text-muted-foreground">{t("allowedToolsHint")}</p>
      <div className="space-y-1">
        {allTools.map((tool) => {
          const checked = selected.includes(tool.name);
          return (
            <label key={tool.id} className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(tool.name)}
                className="rounded border-input"
              />
              <span>{tool.displayName}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
