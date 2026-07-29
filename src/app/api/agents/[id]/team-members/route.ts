import { apiOk, apiError } from "@/lib/api-response";
import { getAgent } from "@/server/agents";
import { getTeamMembers, setTeamMembers } from "@/server/agent-team";
import { teamMembersInputSchema } from "@/lib/validation/agent-team";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const agent = await getAgent(id);
  if (!agent) return apiError(404, "not_found", "Agent not found");
  const members = await getTeamMembers(id);
  return apiOk(members);
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const agent = await getAgent(id);
  if (!agent) return apiError(404, "not_found", "Agent not found");

  const body = await request.json();
  const parsed = teamMembersInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "validation_error", parsed.error.issues[0]?.message ?? "Invalid input");
  }

  await setTeamMembers(id, parsed.data.members);
  const members = await getTeamMembers(id);
  return apiOk(members);
}
