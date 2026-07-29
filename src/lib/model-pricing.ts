type ModelPricing = { input: number; output: number };

const PRICING_PER_1M_TOKENS: Record<string, ModelPricing> = {
  "gpt-4o":              { input: 2.50,  output: 10.00 },
  "gpt-4o-mini":         { input: 0.15,  output: 0.60  },
  "gpt-4-turbo":         { input: 10.00, output: 30.00 },
  "gpt-3.5-turbo":       { input: 0.50,  output: 1.50  },
  "claude-3.5-sonnet":   { input: 3.00,  output: 15.00 },
  "claude-3-haiku":      { input: 0.25,  output: 1.25  },
  "claude-3-opus":       { input: 15.00, output: 75.00 },
  "deepseek-chat":       { input: 0.14,  output: 0.28  },
  "deepseek-reasoner":   { input: 0.55,  output: 2.19  },
};

const DEFAULT_PRICING: ModelPricing = { input: 1.00, output: 3.00 };

function findPricing(model: string): ModelPricing {
  const lower = model.toLowerCase();
  for (const [key, pricing] of Object.entries(PRICING_PER_1M_TOKENS)) {
    if (lower.includes(key)) return pricing;
  }
  return DEFAULT_PRICING;
}

export function estimateCost(
  rows: Array<{ model: string | null; promptTokens: number | null; completionTokens: number | null }>
): number {
  let total = 0;
  for (const row of rows) {
    const pricing = findPricing(row.model ?? "");
    total += ((row.promptTokens ?? 0) / 1_000_000) * pricing.input;
    total += ((row.completionTokens ?? 0) / 1_000_000) * pricing.output;
  }
  return Math.round(total * 10000) / 10000;
}
