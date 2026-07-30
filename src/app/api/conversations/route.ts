import { apiOk } from "@/lib/api-response";
import { listConversationsForUser } from "@/server/conversations";
import { requireUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const rows = await listConversationsForUser(user.id);
  return apiOk(rows);
}
