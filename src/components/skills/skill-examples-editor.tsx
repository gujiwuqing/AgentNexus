"use client";

import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { SkillExample } from "@/types/skill";

export function SkillExamplesEditor({
  examples,
  onChange,
}: {
  examples: SkillExample[];
  onChange: (examples: SkillExample[]) => void;
}) {
  const t = useTranslations("skills.form");

  function addExample() {
    onChange([...examples, { input: "", output: "" }]);
  }

  function removeExample(index: number) {
    onChange(examples.filter((_, i) => i !== index));
  }

  function updateExample(index: number, field: "input" | "output", value: string) {
    const updated = examples.map((ex, i) => i === index ? { ...ex, [field]: value } : ex);
    onChange(updated);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{t("examples")}</Label>
        <Button type="button" variant="outline" size="sm" onClick={addExample}>
          <Plus className="h-3 w-3 mr-1" />
          {t("addExample")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("examplesHint")}</p>
      {examples.map((ex, i) => (
        <div key={i} className="relative border rounded-lg p-3 space-y-2">
          <button
            type="button"
            onClick={() => removeExample(i)}
            className="absolute top-2 right-2 p-1 rounded hover:bg-muted text-muted-foreground"
          >
            <X className="h-3 w-3" />
          </button>
          <div className="space-y-1">
            <Label className="text-xs">{t("exampleInput")}</Label>
            <Textarea
              rows={2}
              value={ex.input}
              onChange={(e) => updateExample(i, "input", e.target.value)}
              className="resize-y text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("exampleOutput")}</Label>
            <Textarea
              rows={2}
              value={ex.output}
              onChange={(e) => updateExample(i, "output", e.target.value)}
              className="resize-y text-sm"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
