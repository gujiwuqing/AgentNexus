import { z } from "zod";
import { getConversationById } from "@/server/conversations";
import { appendAssistantMessage } from "@/server/messages";
import { apiOk, apiError } from "@/lib/api-response";

const bodySchema = z.object({
  content: z.string().trim().min(1, "content is required"),
  model: z.string().nullable().optional(),
  durationMs: z.number().int().nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const conversation = await getConversationById(id);
  if (!conversation) return apiError(404, "not_found", "Conversation not found");

  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "validation_error", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { content, model, durationMs } = parsed.data;
  const created = await appendAssistantMessage(id, content.trim(), { model, durationMs });
  return apiOk(created, 201);
}
