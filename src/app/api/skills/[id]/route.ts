import { skillUpdateSchema } from "@/lib/validation/skill";
import { getSkillOwnedBy, updateSkill, deleteSkill } from "@/server/skills";
import { apiOk, apiError } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const skill = await getSkillOwnedBy(id, user.id);
  if (!skill) return apiError(404, "not_found", "Skill not found");
  return apiOk(skill);
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const body = await request.json();
  const parsed = skillUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "validation_error", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const updated = await updateSkill(id, parsed.data, user.id);
  if (!updated) return apiError(404, "not_found", "Skill not found");
  return apiOk(updated);
}

export async function DELETE(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const deleted = await deleteSkill(id, user.id);
  if (!deleted) return apiError(404, "not_found", "Skill not found");
  return new Response(null, { status: 204 });
}
