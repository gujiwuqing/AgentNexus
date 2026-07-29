import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useTranslations } from "next-intl";
import { NodeShell } from "./node-shell";

type CodeExecuteNodeData = {
  label: string;
  config: { code: string };
  runStatus?: string;
};

export function CodeExecuteNode({ data }: NodeProps) {
  const d = data as unknown as CodeExecuteNodeData;
  const t = useTranslations("workflowExt");

  return (
    <NodeShell
      type="code_execute"
      label={d.label || t("nodeTypes.codeExecute.label")}
      subtitle={d.config?.code || t("nodeDefaults.noCode")}
      runStatus={d.runStatus}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeShell>
  );
}
