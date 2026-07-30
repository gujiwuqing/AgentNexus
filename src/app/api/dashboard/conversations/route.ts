import { apiOk, apiError } from "@/lib/api-response";
import { getConversationDrilldown, type DateRange } from "@/server/dashboard";
import { requireUser } from "@/lib/auth";

const VALID_RANGES = new Set(["7d", "30d", "90d"]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") ?? "7d";

  if (!VALID_RANGES.has(range)) {
    return apiError(400, "validation_error", "range must be 7d, 30d, or 90d");
  }

  const agentId = searchParams.get("agentId") ?? undefined;
  const model = searchParams.get("model") ?? undefined;
  const date = searchParams.get("date") ?? undefined;
  if (date && !DATE_PATTERN.test(date)) {
    return apiError(400, "validation_error", "date must be YYYY-MM-DD");
  }

  const rows = await getConversationDrilldown(range as DateRange, user.id, { agentId, model, date });
  return apiOk(rows);
}
