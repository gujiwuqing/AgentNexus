import { apiOk, apiError } from "@/lib/api-response";
import { getAgentOwnedBy } from "@/server/agents";
import { getAgentCustomTools, setAgentCustomTools } from "@/server/agent-custom-tools";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const agent = await getAgentOwnedBy(id, user.id);
  if (!agent) return apiError(404, "not_found", "Agent not found");
  const tools = await getAgentCustomTools(id);
  return apiOk(tools);
}

export async function PUT(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const agent = await getAgentOwnedBy(id, user.id);
  if (!agent) return apiError(404, "not_found", "Agent not found");
  const body = await request.json();
  const toolIds: string[] = Array.isArray(body?.toolIds) ? body.toolIds : [];
  await setAgentCustomTools(id, toolIds, user.id);
  const result = await getAgentCustomTools(id);
  return apiOk(result);
}
