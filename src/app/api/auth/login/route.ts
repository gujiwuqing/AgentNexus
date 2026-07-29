import { NextResponse } from "next/server";
import { authenticateWithCredentials, createSessionCookie, buildSetCookieHeader } from "@/lib/auth";
import { apiError } from "@/lib/api-response";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) return apiError(400, "validation_error", "email and password are required");

  const user = await authenticateWithCredentials(email, password);
  if (!user) return apiError(401, "invalid_credentials", "Email or password is incorrect");

  const cookieValue = await createSessionCookie(user.id);
  const res = NextResponse.json(user, { status: 200 });
  res.headers.set("set-cookie", buildSetCookieHeader(cookieValue));
  return res;
}
