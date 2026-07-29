import { workflowUpdateSchema } from "@/lib/validation/workflow";
import { getWorkflowOwnedBy, updateWorkflow, deleteWorkflow } from "@/server/workflows";
import { apiOk, apiError } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const w = await getWorkflowOwnedBy(id, user.id);
  if (!w) return apiError(404, "not_found", "Workflow not found");
  return apiOk(w);
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const body = await request.json();
  const parsed = workflowUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "validation_error", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const updated = await updateWorkflow(id, parsed.data, user.id);
  if (!updated) return apiError(404, "not_found", "Workflow not found");
  return apiOk(updated);
}

export async function DELETE(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const deleted = await deleteWorkflow(id, user.id);
  if (!deleted) return apiError(404, "not_found", "Workflow not found");
  return new Response(null, { status: 204 });
}
