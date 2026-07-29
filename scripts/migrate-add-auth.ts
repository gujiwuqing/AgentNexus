/**
 * 一次性数据迁移脚本：为多用户系统初始化默认超级管理员账号，
 * 并把现有 agents/workflows/knowledge_bases/conversations/ai_provider_config 数据
 * 回填到该账号下。
 *
 * 运行方式（需先在 .env.local 中设置好 DATABASE_URL）：
 *   MIGRATE_ADMIN_EMAIL=you@example.com MIGRATE_ADMIN_PASSWORD='强密码' \
 *     pnpm exec dotenv -e .env.local -- tsx scripts/migrate-add-auth.ts
 *
 * 该脚本只能运行一次：若 users 表已有数据会直接 abort。
 */
import { db } from "@/db";
import { users, agents, workflows, knowledgeBases, conversations, aiProviderConfig } from "@/db/schema";
import { createUser } from "@/server/users";

async function main() {
  const email = process.env.MIGRATE_ADMIN_EMAIL;
  const password = process.env.MIGRATE_ADMIN_PASSWORD;
  if (!email || !password) {
    console.error("Set MIGRATE_ADMIN_EMAIL and MIGRATE_ADMIN_PASSWORD env vars");
    process.exit(1);
  }

  const existing = await db.select().from(users).limit(1);
  if (existing.length > 0) {
    console.error("Migration already run: users table is not empty. Aborting.");
    process.exit(1);
  }

  const admin = await createUser({
    email: email.toLowerCase().trim(),
    password,
    name: "Super Admin",
    role: "superAdmin",
  });
  console.log("Created superAdmin account:");
  console.log("  id:    ", admin!.id);
  console.log("  email: ", admin!.email);

  await db.update(agents).set({ userId: admin!.id });
  await db.update(workflows).set({ userId: admin!.id });
  await db.update(knowledgeBases).set({ userId: admin!.id });
  await db.update(conversations).set({ userId: admin!.id });
  await db.update(aiProviderConfig).set({ userId: admin!.id });

  console.log("Backfilled userId on existing rows.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
