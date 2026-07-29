import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useTranslations } from "next-intl";
import { NodeShell } from "./node-shell";

type ConditionNodeData = {
  label: string;
  config: { expression: string };
  runStatus?: string;
};

export function ConditionNode({ data }: NodeProps) {
  const d = data as unknown as ConditionNodeData;
  const t = useTranslations("workflowExt");

  return (
    <NodeShell
      type="condition"
      label={d.label || t("nodeTypes.condition.label")}
      subtitle={d.config?.expression || t("nodeDefaults.noExpression")}
      runStatus={d.runStatus}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} id="true" style={{ top: "30%" }} />
      <Handle type="source" position={Position.Right} id="false" style={{ top: "70%" }} />
    </NodeShell>
  );
}
