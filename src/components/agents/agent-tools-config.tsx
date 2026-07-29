"use client";

import { useTranslations } from "next-intl";
import { Clock, Globe, Code2, Send } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type ToolInfo = { name: string; displayName: string; description: string; icon: LucideIcon };

const TOOL_LIST: ToolInfo[] = [
  { name: "current_time", displayName: "Current Time", description: "Get current date and time", icon: Clock },
  { name: "http_request", displayName: "HTTP Request", description: "Make HTTP requests to URLs", icon: Send },
  { name: "web_search", displayName: "Web Search", description: "Search the web for information", icon: Globe },
  { name: "code_execute", displayName: "Code Execute", description: "Execute JavaScript code", icon: Code2 },
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
      onChange(enabledTools.filter((t) => t !== name));
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
              className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                enabled
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/40"
              }`}
            >
              <tool.icon className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{tool.displayName}</p>
                <p className="text-xs text-muted-foreground">{tool.description}</p>
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
