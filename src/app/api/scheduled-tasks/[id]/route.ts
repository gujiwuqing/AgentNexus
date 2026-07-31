import { apiOk, apiError } from "@/lib/api-response";
import { getScheduledTask, updateScheduledTask, deleteScheduledTask } from "@/server/scheduled-tasks";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const task = await getScheduledTask(id);
  if (!task) return apiError(404, "not_found", "Task not found");
  return apiOk(task);
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const body = await request.json();
  const updated = await updateScheduledTask(id, body, user.id);
  if (!updated) return apiError(404, "not_found", "Task not found");
  return apiOk(updated);
}

export async function DELETE(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const deleted = await deleteScheduledTask(id, user.id);
  if (!deleted) return apiError(404, "not_found", "Task not found");
  return new Response(null, { status: 204 });
}
