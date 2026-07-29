import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { users, agents, workflows, conversations, knowledgeBases } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { createId } from "@/lib/id";
import type { SafeUser } from "./users";
import { toSafeUser } from "./users";

export type AdminUserRow = SafeUser & {
  agentCount: number;
  conversationCount: number;
};

export async function listUsersWithStats(): Promise<AdminUserRow[]> {
  const allUsers = await db.select().from(users);
  const out: AdminUserRow[] = [];
  for (const u of allUsers) {
    const agentRows = await db.select({ id: agents.id }).from(agents).where(eq(agents.userId, u.id));
    const convRows = await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.userId, u.id));
    out.push({
      ...toSafeUser(u),
      agentCount: agentRows.length,
      conversationCount: convRows.length,
    });
  }
  return out;
}

export async function getAdminUserById(id: string) {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row ?? null;
}

export async function createUserByAdmin(input: {
  email: string;
  password: string;
  name: string;
  avatar?: string | null;
  role: "user" | "admin" | "superAdmin";
}): Promise<SafeUser> {
  const id = createId();
  const passwordHash = await hashPassword(input.password);
  await db.insert(users).values({
    id,
    email: input.email.toLowerCase().trim(),
    username: null,
    passwordHash,
    name: input.name,
    avatar: input.avatar ?? null,
    role: input.role,
  });
  const row = await getAdminUserById(id);
  return toSafeUser(row!);
}

export async function updateUserByAdmin(
  id: string,
  input: { name?: string; avatar?: string | null; role?: "user" | "admin" | "superAdmin" },
) {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof input.name === "string") updates.name = input.name;
  if (typeof input.avatar !== "undefined") updates.avatar = input.avatar || null;
  if (input.role) updates.role = input.role;
  await db.update(users).set(updates).where(eq(users.id, id));
  const row = await getAdminUserById(id);
  return row ? toSafeUser(row) : null;
}

export async function resetUserPassword(id: string, newPassword: string) {
  const passwordHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, id));
}

export async function deleteUser(id: string) {
  await db.delete(users).where(eq(users.id, id));
}

export async function getAdminOverview() {
  const userRows = await db.select({ id: users.id }).from(users);
  const agentRows = await db.select({ id: agents.id }).from(agents);
  const convRows = await db.select({ id: conversations.id }).from(conversations);
  const wfRows = await db.select({ id: workflows.id }).from(workflows);
  return {
    userCount: userRows.length,
    agentCount: agentRows.length,
    conversationCount: convRows.length,
    workflowCount: wfRows.length,
  };
}

export async function listAllAgents() {
  return db
    .select({
      id: agents.id,
      name: agents.name,
      description: agents.description,
      avatar: agents.avatar,
      ownerEmail: users.email,
      ownerName: users.name,
      createdAt: agents.createdAt,
    })
    .from(agents)
    .innerJoin(users, eq(agents.userId, users.id))
    .orderBy(desc(agents.createdAt));
}

export async function listAllWorkflows() {
  return db
    .select({
      id: workflows.id,
      name: workflows.name,
      description: workflows.description,
      ownerEmail: users.email,
      ownerName: users.name,
      createdAt: workflows.createdAt,
    })
    .from(workflows)
    .innerJoin(users, eq(workflows.userId, users.id))
    .orderBy(desc(workflows.createdAt));
}

export async function listAllKnowledgeBases() {
  return db
    .select({
      id: knowledgeBases.id,
      name: knowledgeBases.name,
      description: knowledgeBases.description,
      ownerEmail: users.email,
      ownerName: users.name,
      createdAt: knowledgeBases.createdAt,
    })
    .from(knowledgeBases)
    .innerJoin(users, eq(knowledgeBases.userId, users.id))
    .orderBy(desc(knowledgeBases.createdAt));
}

export async function listAllConversations() {
  return db
    .select({
      id: conversations.id,
      title: conversations.title,
      ownerEmail: users.email,
      ownerName: users.name,
      createdAt: conversations.createdAt,
    })
    .from(conversations)
    .innerJoin(users, eq(conversations.userId, users.id))
    .orderBy(desc(conversations.createdAt));
}
