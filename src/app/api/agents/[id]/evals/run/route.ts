import { apiOk, apiError } from "@/lib/api-response";
import { getAgentOwnedBy } from "@/server/agents";
import { listEvalCases } from "@/server/evals";
import { runEvalCase } from "@/lib/evals/runner";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const agent = await getAgentOwnedBy(id, user.id);
  if (!agent) return apiError(404, "not_found", "Agent not found");

  const cases = await listEvalCases(id, user.id);
  if (cases.length === 0) {
    return apiError(400, "no_cases", "No eval cases found for this agent");
  }

  const results = [];
  for (const evalCase of cases) {
    try {
      const result = await runEvalCase(evalCase, user.id);
      results.push({ caseId: evalCase.id, name: evalCase.name, ...result });
    } catch (err) {
      results.push({ caseId: evalCase.id, name: evalCase.name, score: 0, feedback: err instanceof Error ? err.message : "Failed", output: "" });
    }
  }

  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  return apiOk({ results, averageScore: avgScore });
}
