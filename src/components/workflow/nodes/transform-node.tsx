import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useTranslations } from "next-intl";
import { NodeShell } from "./node-shell";

type TransformNodeData = {
  label: string;
  config: { operation: string };
  runStatus?: string;
};

export function TransformNode({ data }: NodeProps) {
  const d = data as unknown as TransformNodeData;
  const t = useTranslations("workflowExt");

  return (
    <NodeShell
      type="transform"
      label={d.label || t("nodeTypes.transform.label")}
      subtitle={d.config?.operation || t("nodeDefaults.noOperation")}
      runStatus={d.runStatus}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeShell>
  );
}
