import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useTranslations } from "next-intl";
import { NodeShell } from "./node-shell";

type VariableAggregateNodeData = {
  label: string;
  config: { sourceNodeIds: string[] };
  runStatus?: string;
};

export function VariableAggregateNode({ data }: NodeProps) {
  const d = data as unknown as VariableAggregateNodeData;
  const t = useTranslations("workflowExt");
  const count = d.config?.sourceNodeIds?.length ?? 0;

  return (
    <NodeShell
      type="variable_aggregate"
      label={d.label || t("nodeTypes.variableAggregate.label")}
      subtitle={count > 0 ? t("nodeDefaults.sourceCount", { count }) : t("nodeDefaults.noSources")}
      runStatus={d.runStatus}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeShell>
  );
}
