import { workflowInputSchema } from "@/lib/validation/workflow";
import { createWorkflow, listWorkflows } from "@/server/workflows";
import { apiOk, apiError } from "@/lib/api-response";

export async function GET() {
  const all = await listWorkflows();
  return apiOk(all);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = workflowInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "validation_error", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const created = await createWorkflow(parsed.data);
  return apiOk(created, 201);
}
