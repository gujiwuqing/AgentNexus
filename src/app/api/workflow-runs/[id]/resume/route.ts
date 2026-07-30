import { enqueueResumeRun, getWorkflowRun } from "@/server/workflow-runs";
import { getWorkflowOwnedBy } from "@/server/workflows";
import { apiOk, apiError } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const existing = await getWorkflowRun(id);
  if (!existing) return apiError(404, "not_found", "Run not found or not waiting for input");
  const workflow = await getWorkflowOwnedBy(existing.run.workflowId, user.id);
  if (!workflow) return apiError(404, "not_found", "Run not found or not waiting for input");

  const body = await request.json().catch(() => ({}));
  const input = typeof body?.input === "string" ? body.input : "";
  const result = await enqueueResumeRun(id, input);
  if (!result) return apiError(404, "not_found", "Run not found or not waiting for input");
  return apiOk(result, 202);
}
