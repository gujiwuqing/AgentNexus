"use client";

import { useParams } from "next/navigation";
import { WorkflowEditor } from "@/components/workflow/workflow-editor";

export default function WorkflowEditorPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  return <WorkflowEditor workflowId={workflowId} />;
}
