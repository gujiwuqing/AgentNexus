import { NextResponse } from "next/server";
import { parseSessionToken, clearSession, CLEAR_COOKIE_HEADER } from "@/lib/auth";

export async function POST(request: Request) {
  const token = parseSessionToken(request);
  if (token) await clearSession(token);
  const res = NextResponse.json({ ok: true });
  res.headers.set("set-cookie", CLEAR_COOKIE_HEADER);
  return res;
}
