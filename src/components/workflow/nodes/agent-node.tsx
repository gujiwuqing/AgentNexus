import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useTranslations } from "next-intl";
import { NodeShell } from "./node-shell";

type AgentNodeData = {
  label: string;
  config: { agentId: string; promptTemplate: string };
  runStatus?: string;
};

export function AgentNode({ data }: NodeProps) {
  const d = data as unknown as AgentNodeData;
  const t = useTranslations("workflowExt");

  return (
    <NodeShell
      type="agent"
      label={d.label || t("nodeTypes.agent.label")}
      subtitle={d.config?.promptTemplate || t("nodeDefaults.noPrompt")}
      runStatus={d.runStatus}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeShell>
  );
}
