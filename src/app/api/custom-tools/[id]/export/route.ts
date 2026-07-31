import { apiError } from "@/lib/api-response";
import { getCustomToolOwnedBy } from "@/server/custom-tools";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const tool = await getCustomToolOwnedBy(id, user.id);
  if (!tool) return apiError(404, "not_found", "Tool not found");

  const exportData = {
    type: "tool",
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    data: {
      name: tool.name,
      displayName: tool.displayName,
      description: tool.description,
      icon: tool.icon,
      tags: tool.tags,
      type: tool.type,
      httpConfig: tool.httpConfig,
      promptConfig: tool.promptConfig,
      parameters: tool.parameters,
    },
  };

  const encodedFilename = encodeURIComponent(`${tool.name}.tool.json`);

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="tool.json"; filename*=UTF-8''${encodedFilename}`,
    },
  });
}
