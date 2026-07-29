"use client";

import { useTranslations } from "next-intl";

type TemplatePickerItem = {
  id: string;
  name: string;
  description: string;
  icon: string;
  output: string;
};

type TemplatePickerProps = {
  items: TemplatePickerItem[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function TemplatePicker({ items, selectedId, onSelect }: TemplatePickerProps) {
  const t = useTranslations("agentsExt.templatePicker");

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const isSelected = item.id === selectedId;

        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(item.id)}
            className={`rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card hover:border-primary/50 hover:bg-muted/40"}`}
          >
            <span className="flex items-start gap-3">
              <span className="mt-0.5 text-xl leading-none" aria-hidden="true">{item.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3">
                  <span className="font-medium text-foreground">{item.name}</span>
                  {isSelected && <span className="text-xs font-medium text-primary">{t("selected")}</span>}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">{item.description}</span>
                <span className="mt-3 block text-xs font-medium text-muted-foreground">{t("recommendedOutput", { output: item.output })}</span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
