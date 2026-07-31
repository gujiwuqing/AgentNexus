import { apiError } from "@/lib/api-response";
import { getSkillOwnedBy } from "@/server/skills";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const skill = await getSkillOwnedBy(id, user.id);
  if (!skill) return apiError(404, "not_found", "Skill not found");

  const exportData = {
    type: "skill",
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    data: {
      name: skill.name,
      description: skill.description,
      icon: skill.icon,
      tags: skill.tags,
      category: skill.category,
      version: skill.version,
      argumentHint: skill.argumentHint,
      content: skill.content,
    },
  };

  const encodedFilename = encodeURIComponent(`${skill.name}.skill.json`);

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="skill.json"; filename*=UTF-8''${encodedFilename}`,
    },
  });
}
