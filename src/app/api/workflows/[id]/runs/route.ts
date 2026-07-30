import { triggerWorkflowRun, listWorkflowRuns } from "@/server/workflow-runs";
import { getWorkflowOwnedBy } from "@/server/workflows";
import { apiOk, apiError } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const workflow = await getWorkflowOwnedBy(id, user.id);
  if (!workflow) return apiError(404, "not_found", "Workflow not found");
  const runs = await listWorkflowRuns(id);
  return apiOk(runs);
}

export async function POST(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const workflow = await getWorkflowOwnedBy(id, user.id);
  if (!workflow) return apiError(404, "not_found", "Workflow not found");
  const body = await request.json().catch(() => ({}));
  const input = typeof body?.input === "string" ? body.input : "";
  const stepMode = body?.stepMode === true;
  try {
    const result = await triggerWorkflowRun(id, input, stepMode);
    return apiOk(result);
  } catch (err) {
    return apiError(400, "execution_error", err instanceof Error ? err.message : "Failed to run workflow");
  }
}
