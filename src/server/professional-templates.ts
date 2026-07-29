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

export async function replaceWithProfessionalTemplates() {
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
      })),
    );
    const workflowInputs = createProfessionalWorkflowTemplates(agentIds);
    await tx.insert(workflows).values(
      workflowInputs.map((workflow) => ({
        id: createId(),
        name: workflow.name,
        description: workflow.description,
        graph: workflow.graph,
      })),
    );

    return {
      agents: await tx.select().from(agents),
      workflows: await tx.select().from(workflows),
    };
  });
}
