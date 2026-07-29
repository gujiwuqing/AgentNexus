import { apiOk, apiError } from "@/lib/api-response";
import { getWorkflowOwnedBy } from "@/server/workflows";
import { listWorkflowVersions } from "@/server/workflow-versions";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const workflow = await getWorkflowOwnedBy(id, user.id);
  if (!workflow) return apiError(404, "not_found", "Workflow not found");
  const versions = await listWorkflowVersions(id);
  return apiOk(versions);
}
