import { customToolUpdateSchema } from "@/lib/validation/custom-tool";
import { getCustomToolOwnedBy, updateCustomTool, deleteCustomTool } from "@/server/custom-tools";
import { apiOk, apiError } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const tool = await getCustomToolOwnedBy(id, user.id);
  if (!tool) return apiError(404, "not_found", "Custom tool not found");
  return apiOk(tool);
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const body = await request.json();
  const parsed = customToolUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "validation_error", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const updated = await updateCustomTool(id, parsed.data, user.id);
  if (!updated) return apiError(404, "not_found", "Custom tool not found");
  return apiOk(updated);
}

export async function DELETE(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const deleted = await deleteCustomTool(id, user.id);
  if (!deleted) return apiError(404, "not_found", "Custom tool not found");
  return new Response(null, { status: 204 });
}
