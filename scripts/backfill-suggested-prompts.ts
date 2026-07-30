import { eq } from 'drizzle-orm';
import { db, pool } from '../src/db';
import { agents } from '../src/db/schema';
import { professionalAgentTemplates } from '../src/lib/professional-templates';

/**
 * 一次性回填：suggestedPrompts 字段是后加的，此前由模板创建的 Agent 该字段为空，
 * 欢迎页只能显示通用兜底文案。这里按 `template:<key>` 标签匹配回模板的开场问题。
 * 已自行配置过开场问题的 Agent 不会被覆盖。
 */
async function main() {
  try {
    const rows = await db.select().from(agents);
    let updated = 0;

    for (const agent of rows) {
      if (agent.suggestedPrompts && agent.suggestedPrompts.length > 0) continue;

      const tags = Array.isArray(agent.tags) ? agent.tags : [];
      const templateTag = tags.find((tag) => tag.startsWith('template:'));
      const template = templateTag
        ? professionalAgentTemplates.find((t) => t.key === templateTag.slice('template:'.length))
        : professionalAgentTemplates.find((t) => t.name === agent.name);

      if (!template) {
        console.log(`skip  ${agent.name} (no matching template)`);
        continue;
      }

      await db
        .update(agents)
        .set({ suggestedPrompts: [...template.suggestedPrompts], updatedAt: new Date() })
        .where(eq(agents.id, agent.id));
      updated += 1;
      console.log(`ok    ${agent.name} <- ${template.key}`);
    }

    console.log(`\nBackfilled ${updated} of ${rows.length} agents.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
