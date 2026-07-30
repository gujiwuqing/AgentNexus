import { apiOk, apiError } from "@/lib/api-response";
import { enqueueRetryRun, getWorkflowRun } from "@/server/workflow-runs";
import { getWorkflowOwnedBy } from "@/server/workflows";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const existing = await getWorkflowRun(id);
  if (!existing) return apiError(404, "not_found", "Run not found or not in failed state");
  const workflow = await getWorkflowOwnedBy(existing.run.workflowId, user.id);
  if (!workflow) return apiError(404, "not_found", "Run not found or not in failed state");

  const body = await request.json().catch(() => ({}));
  const nodeId = typeof body?.nodeId === "string" ? body.nodeId : "";
  if (!nodeId) return apiError(400, "validation_error", "nodeId is required");

  const result = await enqueueRetryRun(id, nodeId);
  if (!result) return apiError(404, "not_found", "Run not found or not in failed state");
  return apiOk(result, 202);
}
