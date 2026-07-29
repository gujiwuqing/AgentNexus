import { getWorkflowRun } from "@/server/workflow-runs";
import { apiOk, apiError } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const data = await getWorkflowRun(id);
  if (!data) return apiError(404, "not_found", "Workflow run not found");
  return apiOk(data);
}
