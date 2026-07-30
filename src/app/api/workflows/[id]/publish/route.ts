import { publishWorkflow } from "@/server/workflows";
import { getWorkflowOwnedBy } from "@/server/workflows";
import { validateGraph } from "@/lib/workflow/validate-graph";
import { apiOk, apiError } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import type { WorkflowGraph } from "@/types/workflow";

type Params = { params: Promise<{ id: string }> };

/** 发布当前草稿为正式版本。发布前做与运行相同的严格校验，避免发布出跑不起来的版本。 */
export async function POST(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const workflow = await getWorkflowOwnedBy(id, user.id);
  if (!workflow) return apiError(404, "not_found", "Workflow not found");

  const issues = validateGraph(workflow.graph as WorkflowGraph);
  if (issues.length > 0) {
    return apiError(400, "invalid_graph", "Workflow has configuration issues", { issues });
  }

  const published = await publishWorkflow(id, user.id);
  if (!published) return apiError(404, "not_found", "Workflow not found");
  return apiOk(published);
}
