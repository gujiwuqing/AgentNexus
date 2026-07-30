"use client";

import { useParams } from "next/navigation";
import { WorkflowEditor } from "@/components/workflow/workflow-editor";

/** 编排视图：可视化编辑 + 调试运行（跑草稿）。正式运行入口在 /workflows/[id]。 */
export default function WorkflowEditPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  return <WorkflowEditor workflowId={workflowId} />;
}
