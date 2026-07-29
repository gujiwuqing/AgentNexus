import { apiOk } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return apiOk(null);
  return apiOk(user);
}
