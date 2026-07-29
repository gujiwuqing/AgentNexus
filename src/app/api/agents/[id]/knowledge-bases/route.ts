import { apiOk, apiError } from "@/lib/api-response";
import { getAgentOwnedBy } from "@/server/agents";
import { getAgentKnowledgeBases, setAgentKnowledgeBases } from "@/server/agent-knowledge";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const agent = await getAgentOwnedBy(id, user.id);
  if (!agent) return apiError(404, "not_found", "Agent not found");
  const kbs = await getAgentKnowledgeBases(id);
  return apiOk(kbs);
}

export async function PUT(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const agent = await getAgentOwnedBy(id, user.id);
  if (!agent) return apiError(404, "not_found", "Agent not found");
  const body = await request.json();
  const knowledgeBaseIds: string[] = Array.isArray(body?.knowledgeBaseIds) ? body.knowledgeBaseIds : [];
  await setAgentKnowledgeBases(id, knowledgeBaseIds, user.id);
  const kbs = await getAgentKnowledgeBases(id);
  return apiOk(kbs);
}
