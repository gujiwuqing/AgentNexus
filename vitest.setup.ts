import { execSync } from "child_process";
import mysql from "mysql2/promise";

const testUrl = process.env.DATABASE_URL_TEST;
if (!testUrl) throw new Error("DATABASE_URL_TEST is not set");

// 让被测代码的 db/index.ts 连到 test 库
process.env.DATABASE_URL = testUrl;

// 只用 URL 取库名;host/user/password 交给 mysql2 自己解析,避免手动解码密码
const dbName = new URL(testUrl).pathname.replace(/^\//, "");
if (!dbName) throw new Error("DATABASE_URL_TEST must include a database name");
// 去掉末尾 "/dbname" 得到指向 server、不带库的连接串
const serverUrl = testUrl.replace(/\/[^/]*$/, "");

async function setupTestDatabase() {
  const conn = await mysql.createConnection(serverUrl);
  await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  await conn.query(`CREATE DATABASE \`${dbName}\``);
  await conn.end();

  // 用 push --force 给空 test 库建表(--force 跳过交互确认;test 库每次 DROP/CREATE 重建,--force 安全)
  execSync("pnpm exec drizzle-kit push --force", {
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: "pipe",
  });
}

setupTestDatabase().catch((err) => {
  console.error("vitest setup failed:", err);
  process.exit(1);
});
