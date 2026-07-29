import { eq, lt } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { toSafeUser, type SafeUser } from "./users";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 天
const RENEW_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 不足 7 天续期

export async function createSession(userId: string) {
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id, userId, expiresAt });
  return { id, expiresAt };
}

export async function getSessionUser(sessionId: string): Promise<{ user: SafeUser; renewed?: Date } | null> {
  const [row] = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId));

  if (!row) return null;
  if (row.expiresAt.getTime() <= Date.now()) return null;

  let renewed: Date | undefined;
  if (row.expiresAt.getTime() - Date.now() < RENEW_THRESHOLD_MS) {
    renewed = new Date(Date.now() + SESSION_TTL_MS);
    await db.update(sessions).set({ expiresAt: renewed }).where(eq(sessions.id, sessionId));
  }

  return { user: toSafeUser(row.user), renewed };
}

export async function deleteSession(sessionId: string) {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function deleteExpiredSessions() {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}
