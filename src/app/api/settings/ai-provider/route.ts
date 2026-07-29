import { providerConfigInputSchema } from "@/lib/validation/provider";
import { getProviderConfig, upsertProviderConfig } from "@/server/provider-config";
import { apiOk, apiError } from "@/lib/api-response";

export async function GET() {
  const config = await getProviderConfig();
  return apiOk(config);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const parsed = providerConfigInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "validation_error", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const saved = await upsertProviderConfig(parsed.data);
  return apiOk(saved);
}
