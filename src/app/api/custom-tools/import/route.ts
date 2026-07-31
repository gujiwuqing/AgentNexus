import { customToolInputSchema } from "@/lib/validation/custom-tool";
import { createCustomTool } from "@/server/custom-tools";
import { apiOk, apiError } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;

  const body = await request.json().catch(() => null);
  if (!body || body.type !== "tool" || !body.data) {
    return apiError(400, "invalid_format", "Invalid tool export format");
  }

  const parsed = customToolInputSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiError(400, "validation_error", parsed.error.issues[0]?.message ?? "Invalid tool data");
  }

  const created = await createCustomTool(parsed.data, user.id);
  return apiOk(created, 201);
}
