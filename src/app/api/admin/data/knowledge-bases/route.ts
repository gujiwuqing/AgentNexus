import { apiOk } from "@/lib/api-response";
import { requireSuperAdmin } from "@/lib/auth";
import { listAllKnowledgeBases } from "@/server/admin";

export async function GET(request: Request) {
  const user = await requireSuperAdmin(request);
  if (user instanceof Response) return user;
  const rows = await listAllKnowledgeBases();
  return apiOk(rows);
}
