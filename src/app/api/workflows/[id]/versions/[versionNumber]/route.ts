import { apiOk, apiError } from "@/lib/api-response";
import { getWorkflowOwnedBy } from "@/server/workflows";
import { getWorkflowVersion } from "@/server/workflow-versions";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string; versionNumber: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id, versionNumber: vnStr } = await params;
  const vn = parseInt(vnStr, 10);
  if (isNaN(vn)) return apiError(400, "validation_error", "Invalid version number");
  const workflow = await getWorkflowOwnedBy(id, user.id);
  if (!workflow) return apiError(404, "not_found", "Workflow not found");
  const version = await getWorkflowVersion(id, vn);
  if (!version) return apiError(404, "not_found", "Version not found");
  return apiOk(version);
}
