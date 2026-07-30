import { redirect } from "next/navigation";

// 工作流编辑器已迁移到 /workflows/[workflowId]（工作流模块）。
// 保留此路由做重定向，避免旧书签/链接 404。
export default async function LegacyWorkflowEditorRedirect({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  const { workflowId } = await params;
  redirect(`/workflows/${workflowId}`);
}
