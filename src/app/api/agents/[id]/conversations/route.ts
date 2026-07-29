import { createConversation, listConversationsForAgent } from "@/server/conversations";
import { apiOk } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const list = await listConversationsForAgent(id);
  return apiOk(list);
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const title = typeof body?.title === "string" && body.title.trim() ? body.title.trim() : undefined;
  const created = await createConversation(id, title);
  return apiOk(created, 201);
}
