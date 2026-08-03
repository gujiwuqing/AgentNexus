/**
 * 迁移脚本：为 message_traces 表添加 max_steps 和 step_limit_reached 列。
 *
 * 运行方式：
 *   pnpm exec dotenv -e .env.local -- tsx scripts/migrate-add-trace-columns.ts
 */
import { pool } from "@/db";

async function main() {
  const conn = await pool.getConnection();
  try {
    // 检查列是否已存在
    const [columns] = await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'message_traces' AND COLUMN_NAME IN ('max_steps', 'step_limit_reached')`,
    );
    const existing = new Set((columns as Array<{ COLUMN_NAME: string }>).map((r) => r.COLUMN_NAME));

    if (!existing.has("max_steps")) {
      await conn.query(`ALTER TABLE message_traces ADD COLUMN max_steps INT NULL AFTER latency_ms`);
      console.log("✅ 已添加列: max_steps");
    } else {
      console.log("⏭️  列已存在: max_steps");
    }

    if (!existing.has("step_limit_reached")) {
      await conn.query(`ALTER TABLE message_traces ADD COLUMN step_limit_reached INT NULL AFTER max_steps`);
      console.log("✅ 已添加列: step_limit_reached");
    } else {
      console.log("⏭️  列已存在: step_limit_reached");
    }

    console.log("\n🎉 迁移完成");
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ 迁移失败:", err);
  process.exitCode = 1;
});
