"use client";

import { useParams } from "next/navigation";
import { WorkflowRunView } from "@/components/workflow/workflow-run-view";

/** 工作流默认进入“运行视图”；编排/调试在 /workflows/[id]/edit。 */
export default function WorkflowRunPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  return <WorkflowRunView workflowId={workflowId} />;
}
