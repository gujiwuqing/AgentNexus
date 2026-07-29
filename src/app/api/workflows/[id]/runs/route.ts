import { triggerWorkflowRun, listWorkflowRuns } from "@/server/workflow-runs";
import { apiOk, apiError } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const runs = await listWorkflowRuns(id);
  return apiOk(runs);
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const input = typeof body?.input === "string" ? body.input : "";
  try {
    const result = await triggerWorkflowRun(id, input);
    return apiOk(result);
  } catch (err) {
    return apiError(400, "execution_error", err instanceof Error ? err.message : "Failed to run workflow");
  }
}
