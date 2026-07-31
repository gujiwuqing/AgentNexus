import { apiOk, apiError } from "@/lib/api-response";
import { getTraceByMessageId } from "@/server/message-traces";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const trace = await getTraceByMessageId(id);
  if (!trace) return apiError(404, "not_found", "Trace not found");
  return apiOk(trace);
}
