"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Skill, SkillFormValues } from "@/types/skill";

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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("name")}</Label>
            <Input value={values.name} onChange={(e) => update("name", e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>{t("description")}</Label>
            <Textarea rows={2} value={values.description} onChange={(e) => update("description", e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>{t("icon")}</Label>
              <Input value={values.icon} onChange={(e) => update("icon", e.target.value)} placeholder="⚡" />
            </div>
            <div className="space-y-2">
              <Label>{t("version")}</Label>
              <Input value={values.version} onChange={(e) => update("version", e.target.value)} placeholder="1.0.0" />
            </div>
            <div className="space-y-2">
              <Label>{t("category")}</Label>
              <select
                value={values.category}
                onChange={(e) => update("category", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">{tCat("other")}</option>
                <option value="development">{tCat("development")}</option>
                <option value="writing">{tCat("writing")}</option>
                <option value="analysis">{tCat("analysis")}</option>
                <option value="communication">{tCat("communication")}</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("tags")}</Label>
            <Input
              value={values.tags.join(", ")}
              onChange={(e) => update("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              placeholder="开发, 代码质量"
            />
          </div>
          <div className="space-y-2">
            <Label>{t("argumentHint")}</Label>
            <Input
              value={values.argumentHint}
              onChange={(e) => update("argumentHint", e.target.value)}
              placeholder="<PRD链接 / 需求描述 / 代码路径>"
            />
          </div>
        </div>

        <div className="space-y-2 lg:row-span-2">
          <Label>{t("content")}</Label>
          <p className="text-xs text-muted-foreground">{t("contentHint")}</p>
          <Textarea
            className="min-h-[400px] lg:min-h-[500px] resize-y font-mono text-sm"
            value={values.content}
            onChange={(e) => update("content", e.target.value)}
            required
          />
        </div>
      </div>

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
