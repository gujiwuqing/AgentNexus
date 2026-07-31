import { apiOk, apiError } from "@/lib/api-response";
import { getAgentOwnedBy } from "@/server/agents";
import { createEvalCase, listEvalCases } from "@/server/evals";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const agent = await getAgentOwnedBy(id, user.id);
  if (!agent) return apiError(404, "not_found", "Agent not found");
  const cases = await listEvalCases(id, user.id);
  return apiOk(cases);
}

export async function POST(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const agent = await getAgentOwnedBy(id, user.id);
  if (!agent) return apiError(404, "not_found", "Agent not found");

  const body = await request.json();
  const { name, input, expectedOutput, criteria } = body;
  if (!name || !input || !criteria) {
    return apiError(400, "validation_error", "name, input, and criteria are required");
  }

  const created = await createEvalCase({ agentId: id, name, input, expectedOutput, criteria }, user.id);
  return apiOk(created, 201);
}
