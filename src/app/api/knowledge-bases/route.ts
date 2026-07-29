import { apiOk, apiError } from "@/lib/api-response";
import { knowledgeBaseInputSchema } from "@/lib/validation/knowledge";
import { listKnowledgeBases, createKnowledgeBase } from "@/server/knowledge-bases";
import { requireUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const kbs = await listKnowledgeBases(user.id);
  return apiOk(kbs);
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body = await request.json();
  const parsed = knowledgeBaseInputSchema.safeParse(body);
  if (!parsed.success) return apiError(400, "validation_error", parsed.error.issues[0]?.message ?? "Invalid input");
  const kb = await createKnowledgeBase(parsed.data, user.id);
  return apiOk(kb, 201);
}
