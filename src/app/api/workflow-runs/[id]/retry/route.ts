import { apiOk, apiError } from "@/lib/api-response";
import { retryWorkflowRun } from "@/server/workflow-runs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const nodeId = typeof body?.nodeId === "string" ? body.nodeId : "";
  if (!nodeId) return apiError(400, "validation_error", "nodeId is required");

  const result = await retryWorkflowRun(id, nodeId);
  if (!result) return apiError(404, "not_found", "Run not found or not in failed state");
  return apiOk(result);
}
