import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useTranslations } from "next-intl";

type VariableAggregateNodeData = {
  label: string;
  config: { sourceNodeIds: string[] };
  runStatus?: string;
};

export function VariableAggregateNode({ data }: NodeProps) {
  const d = data as unknown as VariableAggregateNodeData;
  const t = useTranslations("workflowExt");
  const borderColor = d.runStatus === "completed" ? "border-green-500" : d.runStatus === "failed" ? "border-red-500" : d.runStatus === "running" ? "border-yellow-500" : "border-border";
  const count = d.config?.sourceNodeIds?.length ?? 0;

  return (
    <div className={`bg-background border-2 ${borderColor} rounded-lg px-3 py-2 min-w-[140px] shadow-sm`}>
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-2 mb-1">
        <span>🔗</span>
        <span className="text-xs font-semibold truncate">{d.label || t("nodeTypes.variableAggregate.label")}</span>
      </div>
      <p className="text-[10px] text-muted-foreground truncate">
        {count > 0 ? t("nodeDefaults.sourceCount", { count }) : t("nodeDefaults.noSources")}
      </p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
