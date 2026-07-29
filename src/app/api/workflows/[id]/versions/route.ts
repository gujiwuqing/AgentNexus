import { apiOk, apiError } from "@/lib/api-response";
import { getWorkflow } from "@/server/workflows";
import { listWorkflowVersions } from "@/server/workflow-versions";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const workflow = await getWorkflow(id);
  if (!workflow) return apiError(404, "not_found", "Workflow not found");
  const versions = await listWorkflowVersions(id);
  return apiOk(versions);
}
