import { generateText } from "ai";
import { createModelClient } from "@/lib/ai/provider-factory";
import { providerConfigInputSchema } from "@/lib/validation/provider";
import { apiError } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body = await request.json();
  const parsed = providerConfigInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "validation_error", parsed.error.issues[0]?.message ?? "Invalid input");
  }

  try {
    const model = createModelClient(parsed.data);
    await generateText({ model, prompt: "ping", maxTokens: 4 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.json({ success: false, message }, { status: 200 });
  }
}
