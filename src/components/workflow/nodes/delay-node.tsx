import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useTranslations } from "next-intl";
import { NodeShell } from "./node-shell";

type DelayNodeData = {
  label: string;
  config: { durationMs: number };
  runStatus?: string;
};

export function DelayNode({ data }: NodeProps) {
  const d = data as unknown as DelayNodeData;
  const t = useTranslations("workflowExt");

  return (
    <NodeShell
      type="delay"
      label={d.label || t("nodeTypes.delay.label")}
      subtitle={d.config?.durationMs ? `${d.config.durationMs}ms` : t("nodeDefaults.noDuration")}
      runStatus={d.runStatus}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeShell>
  );
}
