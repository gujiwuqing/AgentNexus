import { apiOk } from "@/lib/api-response";
import { listPendingInputRuns } from "@/server/workflow-runs";
import { requireUser } from "@/lib/auth";

/** 待办收件箱：当前用户所有等待人工输入的工作流运行（跨工作流聚合，供导航角标与待办列表）。 */
export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const runs = await listPendingInputRuns(user.id);
  return apiOk(runs);
}
