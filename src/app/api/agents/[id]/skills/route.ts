import { apiOk, apiError } from "@/lib/api-response";
import { getAgentOwnedBy } from "@/server/agents";
import { getAgentSkills, setAgentSkills } from "@/server/agent-skills";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const agent = await getAgentOwnedBy(id, user.id);
  if (!agent) return apiError(404, "not_found", "Agent not found");
  const result = await getAgentSkills(id);
  return apiOk(result);
}

export async function PUT(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const agent = await getAgentOwnedBy(id, user.id);
  if (!agent) return apiError(404, "not_found", "Agent not found");
  const body = await request.json();
  const skillIds: string[] = Array.isArray(body?.skillIds) ? body.skillIds : [];
  await setAgentSkills(id, skillIds, user.id);
  const result = await getAgentSkills(id);
  return apiOk(result);
}
