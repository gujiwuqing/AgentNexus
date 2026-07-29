import { agentInputSchema } from "@/lib/validation/agent";
import { createAgent, listAgents } from "@/server/agents";
import { apiOk, apiError } from "@/lib/api-response";

export async function GET() {
  const all = await listAgents();
  return apiOk(all);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = agentInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "validation_error", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const created = await createAgent(parsed.data);
  return apiOk(created, 201);
}
