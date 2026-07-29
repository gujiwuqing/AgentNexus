import { db } from '@/db';
import {
  agents,
  conversations,
  messages,
  workflowRuns,
  workflowStepLogs,
  workflows,
} from '@/db/schema';
import {
  createProfessionalWorkflowTemplates,
  professionalAgentTemplates,
} from '@/lib/professional-templates';
import { createId } from '@/lib/id';

function toAgentInput(template: (typeof professionalAgentTemplates)[number]) {
  const { key, output, tags, ...input } = template;
  return { ...input, tags: [...tags] };
}

/**
 * 用专业模板替换全部 agents/workflows（并清空相关对话/运行数据）。
 * @param userId 新创建的模板归属该用户。
 */
export async function replaceWithProfessionalTemplates(userId: string) {
  return db.transaction(async (tx) => {
    await tx.delete(messages);
    await tx.delete(conversations);
    await tx.delete(workflowStepLogs);
    await tx.delete(workflowRuns);
    await tx.delete(workflows);
    await tx.delete(agents);

    const agentIds = Object.fromEntries(
      professionalAgentTemplates.map((template) => [template.key, createId()]),
    );
    await tx.insert(agents).values(
      professionalAgentTemplates.map((template) => ({
        ...toAgentInput(template),
        id: agentIds[template.key],
        userId,
      })),
    );
    const workflowInputs = createProfessionalWorkflowTemplates(agentIds);
    await tx.insert(workflows).values(
      workflowInputs.map((workflow) => ({
        id: createId(),
        name: workflow.name,
        description: workflow.description,
        graph: workflow.graph,
        userId,
      })),
    );

    return {
      agents: await tx.select().from(agents),
      workflows: await tx.select().from(workflows),
    };
  });
}
