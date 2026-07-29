import { pool } from '../src/db';
import { replaceWithProfessionalTemplates } from '../src/server/professional-templates';
import { db } from '../src/db';
import { users } from '../src/db/schema';

async function main() {
  try {
    // 默认把模板归属到第一个 superAdmin；如无任何用户则报错提示先跑迁移。
    const [firstUser] = await db.select().from(users).limit(1);
    if (!firstUser) {
      console.error('No users found. Run the auth migration script first.');
      process.exitCode = 1;
      return;
    }
    const { agents, workflows } = await replaceWithProfessionalTemplates(firstUser.id);
    console.log(
      `Created ${agents.length} professional agents and ${workflows.length} professional workflows (owned by ${firstUser.email}).`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
