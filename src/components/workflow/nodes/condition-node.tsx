import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useTranslations } from "next-intl";

type ConditionNodeData = {
  label: string;
  config: { expression: string };
  runStatus?: string;
};

export function ConditionNode({ data }: NodeProps) {
  const d = data as unknown as ConditionNodeData;
  const t = useTranslations("workflowExt");
  const borderColor = d.runStatus === "completed" ? "border-green-500" : d.runStatus === "failed" ? "border-red-500" : d.runStatus === "running" ? "border-yellow-500" : "border-border";

  return (
    <div className={`bg-background border-2 ${borderColor} rounded-lg px-3 py-2 min-w-[140px] shadow-sm rotate-0`}>
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-2 mb-1">
        <span>🔀</span>
        <span className="text-xs font-semibold truncate">{d.label || t("nodeTypes.condition.label")}</span>
      </div>
      <p className="text-[10px] text-muted-foreground truncate">{d.config?.expression || t("nodeDefaults.noExpression")}</p>
      <Handle type="source" position={Position.Right} id="true" style={{ top: "30%" }} />
      <Handle type="source" position={Position.Right} id="false" style={{ top: "70%" }} />
    </div>
  );
}
