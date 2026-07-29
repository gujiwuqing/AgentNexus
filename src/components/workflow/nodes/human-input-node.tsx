import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useTranslations } from "next-intl";
import { NodeShell } from "./node-shell";

type HumanInputNodeData = {
  label: string;
  config: { prompt: string };
  runStatus?: string;
};

export function HumanInputNode({ data }: NodeProps) {
  const d = data as unknown as HumanInputNodeData;
  const t = useTranslations("workflowExt");

  return (
    <NodeShell
      type="human_input"
      label={d.label || t("nodeTypes.humanInput.label")}
      subtitle={d.config?.prompt || t("nodeDefaults.noPrompt")}
      runStatus={d.runStatus}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeShell>
  );
}
