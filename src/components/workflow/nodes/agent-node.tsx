import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useTranslations } from "next-intl";

type AgentNodeData = {
  label: string;
  config: { agentId: string; promptTemplate: string };
  runStatus?: string;
};

export function AgentNode({ data }: NodeProps) {
  const d = data as unknown as AgentNodeData;
  const t = useTranslations("workflowExt");
  const borderColor = d.runStatus === "completed" ? "border-green-500" : d.runStatus === "failed" ? "border-red-500" : d.runStatus === "running" || d.runStatus === "waiting_for_input" ? "border-yellow-500" : "border-border";

  return (
    <div className={`bg-background border-2 ${borderColor} rounded-lg px-3 py-2 min-w-[150px] shadow-sm`}>
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-2 mb-1">
        <span>🤖</span>
        <span className="text-xs font-semibold truncate">{d.label || t("nodeTypes.agent.label")}</span>
      </div>
      <p className="text-[10px] text-muted-foreground truncate">{d.config?.promptTemplate || t("nodeDefaults.noPrompt")}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
