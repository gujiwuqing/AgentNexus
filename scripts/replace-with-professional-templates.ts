import { pool } from '../src/db';
import { replaceWithProfessionalTemplates } from '../src/server/professional-templates';

async function main() {
  try {
    const { agents, workflows } = await replaceWithProfessionalTemplates();
    console.log(
      `Created ${agents.length} professional agents and ${workflows.length} professional workflows.`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
