import { apiOk, apiError } from "@/lib/api-response";
import { estimateCost } from "@/lib/model-pricing";
import {
  getOverviewStats,
  getTokenTrend,
  getAgentRanking,
  getModelDistribution,
  getCostEstimationRows,
  type DateRange,
} from "@/server/dashboard";

const VALID_RANGES = new Set(["7d", "30d", "90d"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") ?? "7d";

  if (!VALID_RANGES.has(range)) {
    return apiError(400, "validation_error", "range must be 7d, 30d, or 90d");
  }

  const dateRange = range as DateRange;
  const [overview, tokenTrend, agentRanking, modelDistribution, costRows] = await Promise.all([
    getOverviewStats(dateRange),
    getTokenTrend(dateRange),
    getAgentRanking(dateRange),
    getModelDistribution(dateRange),
    getCostEstimationRows(dateRange),
  ]);

  return apiOk({
    overview: {
      ...overview,
      estimatedCost: estimateCost(costRows),
    },
    tokenTrend,
    agentRanking,
    modelDistribution,
  });
}
