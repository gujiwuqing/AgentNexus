"use client";

import { useTranslations } from "next-intl";

const nodeTypeKeys = [
  { type: "agent", key: "agent", icon: "🤖" },
  { type: "condition", key: "condition", icon: "🔀" },
  { type: "transform", key: "transform", icon: "🔧" },
  { type: "human_input", key: "humanInput", icon: "👤" },
  { type: "http_request", key: "httpRequest", icon: "🌐" },
  { type: "code_execute", key: "codeExecute", icon: "💻" },
  { type: "delay", key: "delay", icon: "⏱️" },
  { type: "variable_aggregate", key: "variableAggregate", icon: "🔗" },
] as const;

export function NodeLibrary() {
  const t = useTranslations("workflowExt");

  function onDragStart(event: React.DragEvent, nodeType: string) {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  }

  return (
    <div className="w-[180px] border-r p-2 space-y-2 overflow-y-auto">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
        {t("nodeLibrary.heading")}
      </p>
      {nodeTypeKeys.map((item) => (
        <div
          key={item.type}
          className="flex items-center gap-2 px-2 py-1.5 rounded border cursor-grab hover:bg-muted text-sm"
          draggable
          onDragStart={(e) => onDragStart(e, item.type)}
        >
          <span>{item.icon}</span>
          <div>
            <p className="text-xs font-medium">{t(`nodeTypes.${item.key}.label`)}</p>
            <p className="text-[10px] text-muted-foreground">{t(`nodeTypes.${item.key}.description`)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
