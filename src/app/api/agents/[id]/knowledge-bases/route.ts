import { apiOk, apiError } from "@/lib/api-response";
import { getAgent } from "@/server/agents";
import { getAgentKnowledgeBases, setAgentKnowledgeBases } from "@/server/agent-knowledge";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const agent = await getAgent(id);
  if (!agent) return apiError(404, "not_found", "Agent not found");
  const kbs = await getAgentKnowledgeBases(id);
  return apiOk(kbs);
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const agent = await getAgent(id);
  if (!agent) return apiError(404, "not_found", "Agent not found");
  const body = await request.json();
  const knowledgeBaseIds: string[] = Array.isArray(body?.knowledgeBaseIds) ? body.knowledgeBaseIds : [];
  await setAgentKnowledgeBases(id, knowledgeBaseIds);
  const kbs = await getAgentKnowledgeBases(id);
  return apiOk(kbs);
}
