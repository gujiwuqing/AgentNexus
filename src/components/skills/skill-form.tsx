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
import { SkillExamplesEditor } from "@/components/skills/skill-examples-editor";
import type { Skill, SkillFormValues } from "@/types/skill";

const CATEGORIES = ["development", "writing", "analysis", "communication", "other"] as const;

function toFormValues(skill?: Skill): SkillFormValues {
  return {
    name: skill?.name ?? "",
    description: skill?.description ?? "",
    icon: skill?.icon ?? "",
    tags: skill?.tags ?? [],
    category: skill?.category ?? "other",
    instructions: skill?.instructions ?? "",
    examples: skill?.examples ?? [],
    recommendedTools: skill?.recommendedTools ?? [],
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
  const [baseline, setBaseline] = useState(() => JSON.stringify(toFormValues(skill)));
  const isDirty = JSON.stringify(values) !== baseline;
  const t = useTranslations("skills.form");
  const tCat = useTranslations("skills.categories");
  const tCommon = useTranslations("common");

  function update<K extends keyof SkillFormValues>(key: K, value: SkillFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(values);
    setBaseline(JSON.stringify(values));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">{t("name")}</Label>
            <Input
              id="name"
              value={values.name}
              onChange={(e) => update("name", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("description")}</Label>
            <Input
              id="description"
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
                placeholder="⚡"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">{t("category")}</Label>
              <Select
                value={values.category}
                onValueChange={(v) => update("category", v)}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {tCat(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="instructions">{t("instructions")}</Label>
            <Textarea
              id="instructions"
              className="min-h-[200px] resize-y"
              value={values.instructions}
              onChange={(e) => update("instructions", e.target.value)}
            />
          </div>

          <SkillExamplesEditor
            examples={values.examples}
            onChange={(exs) => update("examples", exs)}
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
