"use client";

import { useTranslations } from "next-intl";
import { NODE_VISUALS, type NodeVisualType } from "./nodes/node-visuals";

const nodeTypeKeys: { type: NodeVisualType; key: string }[] = [
  { type: "agent", key: "agent" },
  { type: "condition", key: "condition" },
  { type: "transform", key: "transform" },
  { type: "human_input", key: "humanInput" },
  { type: "http_request", key: "httpRequest" },
  { type: "code_execute", key: "codeExecute" },
  { type: "delay", key: "delay" },
  { type: "variable_aggregate", key: "variableAggregate" },
];

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
      {nodeTypeKeys.map((item) => {
        const visual = NODE_VISUALS[item.type];
        const Icon = visual.icon;
        return (
          <div
            key={item.type}
            className="flex items-center gap-2 px-2 py-1.5 rounded border cursor-grab hover:bg-muted hover:border-primary/40 transition-colors text-sm"
            draggable
            onDragStart={(e) => onDragStart(e, item.type)}
          >
            <div className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 ${visual.iconBg}`}>
              <Icon className={`h-3.5 w-3.5 ${visual.iconColor}`} />
            </div>
            <div>
              <p className="text-xs font-medium">{t(`nodeTypes.${item.key}.label`)}</p>
              <p className="text-[10px] text-muted-foreground">{t(`nodeTypes.${item.key}.description`)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
