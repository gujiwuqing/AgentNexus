import { enqueueWorkflowRun, listWorkflowRuns, resolveTriggerGraph } from "@/server/workflow-runs";
import { getWorkflowOwnedBy } from "@/server/workflows";
import { validateGraph } from "@/lib/workflow/validate-graph";
import { apiOk, apiError } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const workflow = await getWorkflowOwnedBy(id, user.id);
  if (!workflow) return apiError(404, "not_found", "Workflow not found");
  const runs = await listWorkflowRuns(id);
  return apiOk(runs);
}

export async function POST(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const workflow = await getWorkflowOwnedBy(id, user.id);
  if (!workflow) return apiError(404, "not_found", "Workflow not found");
  const body = await request.json().catch(() => ({}));
  const input = typeof body?.input === "string" ? body.input : "";
  const stepMode = body?.stepMode === true;
  // draft=true 为编辑器调试运行（跑当前草稿）；默认正式运行（跑已发布版本）
  const draft = body?.draft === true;

  // 运行前严格校验节点配置；校验对象必须是本次实际要执行的 graph
  //（正式运行是发布快照，草稿运行是当前画布），避免跑到一半才失败。
  const resolved = await resolveTriggerGraph(id, draft);
  if (!resolved) return apiError(404, "not_found", "Workflow not found");
  const issues = validateGraph(resolved.graph);
  if (issues.length > 0) {
    return apiError(400, "invalid_graph", "Workflow has configuration issues", { issues });
  }

  // 只登记运行意图并入队，立即返回；实际执行由 worker 消费队列完成，
  // 避免长时间运行的工作流阻塞/超时 HTTP 请求。
  try {
    const result = await enqueueWorkflowRun(id, input, stepMode, { draft });
    return apiOk(result, 202);
  } catch (err) {
    return apiError(400, "execution_error", err instanceof Error ? err.message : "Failed to run workflow");
  }
}
