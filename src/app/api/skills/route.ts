import { skillInputSchema } from "@/lib/validation/skill";
import { createSkill, listSkills } from "@/server/skills";
import { apiOk, apiError } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const all = await listSkills(user.id);
  return apiOk(all);
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body = await request.json();
  const parsed = skillInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "validation_error", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const created = await createSkill(parsed.data, user.id);
  return apiOk(created, 201);
}
