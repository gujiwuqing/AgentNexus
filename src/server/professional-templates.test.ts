import { describe, expect, it, afterEach } from 'vitest';
import { db } from '@/db';
import {
  conversations,
  messages,
  workflowRuns,
  workflowStepLogs,
} from '@/db/schema';
import { clearAllTables, authedUser } from '@/db/test-helpers';
import { createId } from '@/lib/id';
import { createAgent } from './agents';
import { createConversation } from './conversations';
import { appendUserMessage } from './messages';
import { getProviderConfig, upsertProviderConfig } from './provider-config';
import { replaceWithProfessionalTemplates } from './professional-templates';
import { createWorkflow, getWorkflow } from './workflows';

afterEach(clearAllTables);

describe('professional template replacement service', () => {
  it('replaces every authorized record and preserves provider settings', async () => {
    const { user } = await authedUser();
    const oldAgent = await createAgent({
      name: 'Old agent',
      description: '',
      avatar: '',
      tags: [],
      systemPrompt: '',
      temperature: 0.7,
      maxTokens: 1024,
      topP: 1,
      model: null,
    }, user.id);
    const conversation = await createConversation(oldAgent.id, user.id, 'Old conversation');
    await appendUserMessage(conversation.id, 'old message');
    const oldWorkflow = await createWorkflow({
      name: 'Old workflow',
      description: '',
      graph: { nodes: [], edges: [] },
    }, user.id);
    const oldRunId = createId();
    await db.insert(workflowRuns).values({
      id: oldRunId,
      workflowId: oldWorkflow.id,
      status: 'completed',
      input: 'old run',
      context: {},
    });
    await db.insert(workflowStepLogs).values({
      id: createId(),
      runId: oldRunId,
      nodeId: 'old-step',
      nodeType: 'agent',
      input: 'old input',
      status: 'completed',
    });
    await upsertProviderConfig({
      baseUrl: 'https://example.test',
      model: 'model',
      apiKey: 'key',
    }, user.id);

    const result = await replaceWithProfessionalTemplates(user.id);

    expect(result.agents).toHaveLength(7);
    expect(result.workflows).toHaveLength(3);
    expect(await db.select().from(messages)).toEqual([]);
    expect(await db.select().from(conversations)).toEqual([]);
    expect(await db.select().from(workflowRuns)).toEqual([]);
    expect(await db.select().from(workflowStepLogs)).toEqual([]);
    expect(await getWorkflow(oldWorkflow.id)).toBeNull();
    expect(await getProviderConfig(user.id)).toMatchObject({
      baseUrl: 'https://example.test',
      model: 'model',
    });
    expect(
      result.workflows.every((workflow) =>
        workflow.graph.nodes.some((node) => node.type === 'human_input'),
      ),
    ).toBe(true);
  });
});
