import { agentUpdateSchema } from "@/lib/validation/agent";
import { getAgent, updateAgent, deleteAgent } from "@/server/agents";
import { apiOk, apiError } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const agent = await getAgent(id);
  if (!agent) return apiError(404, "not_found", "Agent not found");
  return apiOk(agent);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const parsed = agentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "validation_error", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const updated = await updateAgent(id, parsed.data);
  if (!updated) return apiError(404, "not_found", "Agent not found");
  return apiOk(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const deleted = await deleteAgent(id);
  if (!deleted) return apiError(404, "not_found", "Agent not found");
  return new Response(null, { status: 204 });
}
