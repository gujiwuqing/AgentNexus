import { apiOk, apiError } from "@/lib/api-response";
import { createScheduledTask, listScheduledTasks } from "@/server/scheduled-tasks";
import { requireUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  return apiOk(await listScheduledTasks(user.id));
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body = await request.json();
  const { name, type, targetId, input, cronExpression } = body;
  if (!name || !type || !targetId || !input || !cronExpression) {
    return apiError(400, "validation_error", "All fields are required");
  }
  if (!["agent_chat", "workflow_run"].includes(type)) {
    return apiError(400, "validation_error", "type must be agent_chat or workflow_run");
  }
  const created = await createScheduledTask({ name, type, targetId, input, cronExpression }, user.id);
  return apiOk(created, 201);
}
