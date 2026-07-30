import { apiOk, apiError } from "@/lib/api-response";
import { getWorkflowOwnedBy } from "@/server/workflows";
import { getWorkflowVersion } from "@/server/workflow-versions";
import { diffGraphs } from "@/lib/workflow/graph-diff";
import { requireUser } from "@/lib/auth";
import type { WorkflowGraph } from "@/types/workflow";

type Params = { params: Promise<{ id: string; versionNumber: string }> };

/**
 * 对比某历史版本与当前图的差异。
 * 默认 to = 当前工作流；传 ?to=<versionNumber> 可比较两个历史版本。
 */
export async function GET(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id, versionNumber } = await params;

  const workflow = await getWorkflowOwnedBy(id, user.id);
  if (!workflow) return apiError(404, "not_found", "Workflow not found");

  const fromNumber = Number(versionNumber);
  if (!Number.isInteger(fromNumber) || fromNumber < 1) {
    return apiError(400, "validation_error", "versionNumber must be a positive integer");
  }

  const fromVersion = await getWorkflowVersion(id, fromNumber);
  if (!fromVersion) return apiError(404, "not_found", "Version not found");

  const { searchParams } = new URL(request.url);
  const toParam = searchParams.get("to");

  let toGraph: WorkflowGraph;
  let toLabel: string;
  if (toParam) {
    const toNumber = Number(toParam);
    if (!Number.isInteger(toNumber) || toNumber < 1) {
      return apiError(400, "validation_error", "to must be a positive integer");
    }
    const toVersion = await getWorkflowVersion(id, toNumber);
    if (!toVersion) return apiError(404, "not_found", "Target version not found");
    toGraph = toVersion.graph as WorkflowGraph;
    toLabel = String(toNumber);
  } else {
    toGraph = workflow.graph as WorkflowGraph;
    toLabel = "current";
  }

  const diff = diffGraphs(fromVersion.graph as WorkflowGraph, toGraph);
  return apiOk({ from: String(fromNumber), to: toLabel, diff });
}
