import { apiOk, apiError } from "@/lib/api-response";
import { getWorkflow, updateWorkflow } from "@/server/workflows";
import { getWorkflowVersion } from "@/server/workflow-versions";

type Params = { params: Promise<{ id: string; versionNumber: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id, versionNumber: vnStr } = await params;
  const vn = parseInt(vnStr, 10);
  if (isNaN(vn)) return apiError(400, "validation_error", "Invalid version number");

  const workflow = await getWorkflow(id);
  if (!workflow) return apiError(404, "not_found", "Workflow not found");

  const version = await getWorkflowVersion(id, vn);
  if (!version) return apiError(404, "not_found", "Version not found");

  const updated = await updateWorkflow(id, { graph: version.graph });
  return apiOk(updated);
}
