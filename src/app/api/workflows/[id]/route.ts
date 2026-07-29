import { workflowUpdateSchema } from "@/lib/validation/workflow";
import { getWorkflow, updateWorkflow, deleteWorkflow } from "@/server/workflows";
import { apiOk, apiError } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const w = await getWorkflow(id);
  if (!w) return apiError(404, "not_found", "Workflow not found");
  return apiOk(w);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const parsed = workflowUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "validation_error", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const updated = await updateWorkflow(id, parsed.data);
  if (!updated) return apiError(404, "not_found", "Workflow not found");
  return apiOk(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const deleted = await deleteWorkflow(id);
  if (!deleted) return apiError(404, "not_found", "Workflow not found");
  return new Response(null, { status: 204 });
}
