import { apiOk, apiError } from "@/lib/api-response";
import { knowledgeBaseInputSchema } from "@/lib/validation/knowledge";
import { listKnowledgeBases, createKnowledgeBase } from "@/server/knowledge-bases";

export async function GET() {
  const kbs = await listKnowledgeBases();
  return apiOk(kbs);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = knowledgeBaseInputSchema.safeParse(body);
  if (!parsed.success) return apiError(400, "validation_error", parsed.error.issues[0]?.message ?? "Invalid input");
  const kb = await createKnowledgeBase(parsed.data);
  return apiOk(kb, 201);
}
