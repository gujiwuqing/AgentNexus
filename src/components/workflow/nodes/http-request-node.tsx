import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useTranslations } from "next-intl";
import { NodeShell } from "./node-shell";

type HttpRequestNodeData = {
  label: string;
  config: { url: string; method: string };
  runStatus?: string;
};

export function HttpRequestNode({ data }: NodeProps) {
  const d = data as unknown as HttpRequestNodeData;
  const t = useTranslations("workflowExt");

  return (
    <NodeShell
      type="http_request"
      label={d.label || t("nodeTypes.httpRequest.label")}
      subtitle={d.config?.url || t("nodeDefaults.noUrl")}
      runStatus={d.runStatus}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeShell>
  );
}
