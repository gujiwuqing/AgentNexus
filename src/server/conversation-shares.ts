import { eq, and, isNull } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db } from "@/db";
import { conversationShares } from "@/db/schema";
import { createId } from "@/lib/id";

function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function getActiveShare(conversationId: string) {
  const [row] = await db
    .select()
    .from(conversationShares)
    .where(
      and(
        eq(conversationShares.conversationId, conversationId),
        isNull(conversationShares.revokedAt),
      ),
    );
  return row ?? null;
}

export async function createOrRenewShare(conversationId: string) {
  const existing = await getActiveShare(conversationId);
  if (existing) return existing;

  const [revoked] = await db
    .select()
    .from(conversationShares)
    .where(eq(conversationShares.conversationId, conversationId))
    .limit(1);

  if (revoked) {
    const token = generateToken();
    await db
      .update(conversationShares)
      .set({ token, revokedAt: null, createdAt: new Date() })
      .where(eq(conversationShares.id, revoked.id));
    return { ...revoked, token, revokedAt: null };
  }

  const id = createId();
  const token = generateToken();
  await db.insert(conversationShares).values({ id, conversationId, token });
  const [created] = await db.select().from(conversationShares).where(eq(conversationShares.id, id));
  return created;
}

export async function revokeShare(conversationId: string) {
  const active = await getActiveShare(conversationId);
  if (!active) return false;
  await db
    .update(conversationShares)
    .set({ revokedAt: new Date() })
    .where(eq(conversationShares.id, active.id));
  return true;
}

export async function getShareByToken(token: string) {
  const [row] = await db
    .select()
    .from(conversationShares)
    .where(
      and(
        eq(conversationShares.token, token),
        isNull(conversationShares.revokedAt),
      ),
    );
  return row ?? null;
}
