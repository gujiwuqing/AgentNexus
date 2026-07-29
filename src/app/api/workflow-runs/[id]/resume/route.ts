import { resumeWorkflowRun } from "@/server/workflow-runs";
import { apiOk, apiError } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const input = typeof body?.input === "string" ? body.input : "";
  const result = await resumeWorkflowRun(id, input);
  if (!result) return apiError(404, "not_found", "Run not found or not waiting for input");
  return apiOk(result);
}
