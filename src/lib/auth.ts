import { cookies } from "next/headers";
import { createSession, getSessionUser, deleteSession } from "@/server/sessions";
import { getUserByEmail, toSafeUser, type SafeUser } from "@/server/users";
import { verifyPassword } from "@/lib/password";

export const SESSION_COOKIE = "session_token";

/**
 * 从请求 Cookie 中解析当前用户。
 * @param request 可选；API route 传入时优先从其 cookie header 解析（便于测试与无 Next store 的场景）。
 *                不传（页面 layout）时使用 next/headers 的 cookies()。
 */
export async function getCurrentUser(request?: Request): Promise<SafeUser | null> {
  let token: string | undefined;
  if (request) {
    const cookieHeader = request.headers.get("cookie") ?? "";
    token = parseCookie(cookieHeader)[SESSION_COOKIE];
  } else {
    const store = await cookies();
    token = store.get(SESSION_COOKIE)?.value;
  }
  if (!token) return null;
  const result = await getSessionUser(token);
  return result?.user ?? null;
}

function parseCookie(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = v;
  }
  return out;
}

function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: { code: "unauthorized", message: "Authentication required" } }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

function forbiddenResponse(): Response {
  return new Response(JSON.stringify({ error: { code: "forbidden", message: "Insufficient permissions" } }), {
    status: 403,
    headers: { "content-type": "application/json" },
  });
}

/**
 * 要求已登录。传入 API route 的 request 以便测试注入 cookie。
 * 返回 SafeUser 或 401 Response。调用方：`const user = await requireUser(request); if (user instanceof Response) return user;`
 */
export async function requireUser(request?: Request): Promise<SafeUser | Response> {
  const user = await getCurrentUser(request);
  if (!user) return unauthorizedResponse();
  return user;
}

/** 要求 admin 或 superAdmin。 */
export async function requireAdmin(request?: Request): Promise<SafeUser | Response> {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  if (user.role === "user") return forbiddenResponse();
  return user;
}

/** 要求 superAdmin。 */
export async function requireSuperAdmin(request?: Request): Promise<SafeUser | Response> {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  if (user.role !== "superAdmin") return forbiddenResponse();
  return user;
}

export async function setSessionCookie(userId: string) {
  const { id, expiresAt } = await createSession(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  store.delete(SESSION_COOKIE);
}

export async function authenticateWithCredentials(email: string, password: string): Promise<SafeUser | null> {
  const row = await getUserByEmail(email.toLowerCase().trim());
  if (!row) return null;
  const ok = await verifyPassword(password, row.passwordHash);
  if (!ok) return null;
  return toSafeUser(row);
}
