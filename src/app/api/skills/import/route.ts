import { skillInputSchema } from "@/lib/validation/skill";
import { createSkill } from "@/server/skills";
import { apiOk, apiError } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;

  const body = await request.json().catch(() => null);
  if (!body || body.type !== "skill" || !body.data) {
    return apiError(400, "invalid_format", "Invalid skill export format");
  }

  const parsed = skillInputSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiError(400, "validation_error", parsed.error.issues[0]?.message ?? "Invalid skill data");
  }

  const created = await createSkill(parsed.data, user.id);
  return apiOk(created, 201);
}
