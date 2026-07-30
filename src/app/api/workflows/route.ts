import { workflowInputSchema } from "@/lib/validation/workflow";
import { createWorkflow, listWorkflows } from "@/server/workflows";
import { apiOk, apiError } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import type { WorkflowGraph } from "@/types/workflow";

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const all = await listWorkflows(user.id);
  return apiOk(all);
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body = await request.json();
  const parsed = workflowInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "validation_error", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const created = await createWorkflow({ ...parsed.data, graph: parsed.data.graph as WorkflowGraph }, user.id);
  return apiOk(created, 201);
}
