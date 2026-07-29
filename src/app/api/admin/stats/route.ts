import { apiOk } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { getAdminOverview } from "@/server/admin";

export async function GET(request: Request) {
  const user = await requireAdmin(request);
  if (user instanceof Response) return user;
  const stats = await getAdminOverview();
  return apiOk(stats);
}
