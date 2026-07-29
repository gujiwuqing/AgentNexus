import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createId } from "@/lib/id";
import { hashPassword } from "@/lib/password";

export type SafeUser = {
  id: string;
  email: string;
  username: string | null;
  name: string;
  avatar: string | null;
  role: "user" | "admin" | "superAdmin";
};

export function toSafeUser(row: typeof users.$inferSelect): SafeUser {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    name: row.name,
    avatar: row.avatar,
    role: row.role,
  };
}

export async function getUserById(id: string) {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row ?? null;
}

export async function getUserByEmail(email: string) {
  const [row] = await db.select().from(users).where(eq(users.email, email));
  return row ?? null;
}

export async function listUsers() {
  return db.select().from(users);
}

export async function createUser(input: {
  email: string;
  password: string;
  name: string;
  username?: string;
  avatar?: string | null;
  role: "user" | "admin" | "superAdmin";
}) {
  const id = createId();
  const passwordHash = await hashPassword(input.password);
  await db.insert(users).values({
    id,
    email: input.email,
    username: input.username ?? null,
    passwordHash,
    name: input.name,
    avatar: input.avatar ?? null,
    role: input.role,
  });
  return getUserById(id);
}
