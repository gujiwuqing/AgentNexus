import { apiOk, apiError } from "@/lib/api-response";
import { getWorkflowVersion } from "@/server/workflow-versions";

type Params = { params: Promise<{ id: string; versionNumber: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id, versionNumber: vnStr } = await params;
  const vn = parseInt(vnStr, 10);
  if (isNaN(vn)) return apiError(400, "validation_error", "Invalid version number");
  const version = await getWorkflowVersion(id, vn);
  if (!version) return apiError(404, "not_found", "Version not found");
  return apiOk(version);
}
