import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { apiError } from "@/lib/api-response";
import { toSafeUser } from "@/server/users";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  avatar: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
});

export async function PATCH(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;

  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "validation_error", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { name, avatar, currentPassword, newPassword } = parsed.data;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof name === "string") updates.name = name;
  if (typeof avatar === "string") updates.avatar = avatar || null;

  if (newPassword) {
    if (!currentPassword) {
      return apiError(400, "validation_error", "currentPassword is required to change password");
    }
    const [row] = await db.select().from(users).where(eq(users.id, user.id));
    if (!row) return apiError(404, "not_found", "User not found");
    const ok = await verifyPassword(currentPassword, row.passwordHash);
    if (!ok) return apiError(400, "invalid_credentials", "Current password is incorrect");
    updates.passwordHash = await hashPassword(newPassword);
  }

  await db.update(users).set(updates).where(eq(users.id, user.id));
  const [updated] = await db.select().from(users).where(eq(users.id, user.id));
  return NextResponse.json(toSafeUser(updated!));
}
