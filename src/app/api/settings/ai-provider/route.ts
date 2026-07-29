import { providerConfigInputSchema } from "@/lib/validation/provider";
import { getProviderConfig, upsertProviderConfig } from "@/server/provider-config";
import { apiOk, apiError } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const config = await getProviderConfig(user.id);
  return apiOk(config);
}

export async function PUT(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body = await request.json();
  const parsed = providerConfigInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "validation_error", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const saved = await upsertProviderConfig(parsed.data, user.id);
  return apiOk(saved);
}
