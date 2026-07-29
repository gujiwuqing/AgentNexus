import { getWorkflowRun } from "@/server/workflow-runs";
import { getWorkflowOwnedBy } from "@/server/workflows";
import { apiOk, apiError } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const data = await getWorkflowRun(id);
  if (!data) return apiError(404, "not_found", "Workflow run not found");
  const workflow = await getWorkflowOwnedBy(data.run.workflowId, user.id);
  if (!workflow) return apiError(404, "not_found", "Workflow run not found");
  return apiOk(data);
}
