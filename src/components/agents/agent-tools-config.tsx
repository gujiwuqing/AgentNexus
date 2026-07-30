"use client";

import { useTranslations } from "next-intl";
import { Clock, Globe, Code2, Send } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** 与 src/lib/tools/registry.ts 中注册的工具名保持一致，文案统一走 i18n。 */
const TOOL_LIST: Array<{ name: string; icon: LucideIcon }> = [
  { name: "current_time", icon: Clock },
  { name: "http_request", icon: Send },
  { name: "web_search", icon: Globe },
  { name: "code_execute", icon: Code2 },
];

export function AgentToolsConfig({
  enabledTools,
  onChange,
}: {
  enabledTools: string[];
  onChange: (tools: string[]) => void;
}) {
  const t = useTranslations("agentsExt.tools");

  function toggle(name: string) {
    if (enabledTools.includes(name)) {
      onChange(enabledTools.filter((tool) => tool !== name));
    } else {
      onChange([...enabledTools, name]);
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">{t("title")}</h3>
      <div className="space-y-2">
        {TOOL_LIST.map((tool) => {
          const enabled = enabledTools.includes(tool.name);
          return (
            <button
              key={tool.name}
              type="button"
              onClick={() => toggle(tool.name)}
              aria-pressed={enabled}
              className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                enabled
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/40"
              }`}
            >
              <tool.icon className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{t(`items.${tool.name}.name`)}</p>
                <p className="text-xs text-muted-foreground">{t(`items.${tool.name}.description`)}</p>
              </div>
              <div className={`h-4 w-4 rounded-full border-2 transition-colors ${
                enabled ? "bg-primary border-primary" : "border-muted-foreground/30"
              }`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
