import { cookies } from "next/headers";
import { createSession, getSessionUser, deleteSession } from "@/server/sessions";
import { getUserByEmail, toSafeUser, type SafeUser } from "@/server/users";
import { verifyPassword } from "@/lib/password";

export const SESSION_COOKIE = "session_token";

/**
 * 从请求 Cookie 中解析当前用户。页面 layout 和 API 路由共用。
 * 返回 SafeUser 或 null（未登录 / session 失效）。
 */
export async function getCurrentUser(): Promise<SafeUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const result = await getSessionUser(token);
  return result?.user ?? null;
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
 * 要求已登录。返回 SafeUser 或 401 Response。
 * 调用方约定：`const user = await requireUser(); if (user instanceof Response) return user;`
 */
export async function requireUser(): Promise<SafeUser | Response> {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();
  return user;
}

/** 要求 admin 或 superAdmin。返回 SafeUser 或 401/403 Response。 */
export async function requireAdmin(): Promise<SafeUser | Response> {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (user.role === "user") return forbiddenResponse();
  return user;
}

/** 要求 superAdmin。返回 SafeUser 或 401/403 Response。 */
export async function requireSuperAdmin(): Promise<SafeUser | Response> {
  const user = await requireUser();
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
