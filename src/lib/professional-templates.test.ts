import { describe, expect, it } from 'vitest';
import * as professionalTemplates from './professional-templates';
import {
  PROFESSIONAL_AGENT_TEMPLATE_KEYS,
  createProfessionalWorkflowTemplates,
  professionalAgentTemplates,
} from './professional-templates';

describe('professional template catalog', () => {
  it('contains every approved professional agent template', () => {
    expect(PROFESSIONAL_AGENT_TEMPLATE_KEYS).toEqual([
      'deep-researcher',
      'requirements-analyst',
      'operations-planner',
      'technical-architect',
      'code-reviewer',
      'test-designer',
      'fact-logic-reviewer',
    ]);
    expect(professionalAgentTemplates).toHaveLength(7);
  });

  it('builds three workflows with human approval and mapped agent ids', () => {
    const agentIds = Object.fromEntries(
      PROFESSIONAL_AGENT_TEMPLATE_KEYS.map((key) => [key, `agent-${key}`]),
    );
    const workflows = createProfessionalWorkflowTemplates(agentIds);

    expect(workflows.map((workflow) => workflow.key)).toEqual([
      'research-brief',
      'product-operations-plan',
      'engineering-delivery',
    ]);
    expect(workflows.every((workflow) => workflow.graph.nodes.some((node) => node.type === 'human_input'))).toBe(true);
    expect(workflows.flatMap((workflow) => workflow.graph.nodes).some((node) =>
      node.type === 'agent' && node.config.agentId === 'agent-deep-researcher',
    )).toBe(true);
  });

  it('excludes template-only resolver tags from quick-created agents', () => {
    const toAgentFormValues = (professionalTemplates as Record<string, unknown>).toAgentFormValues;

    expect(toAgentFormValues).toBeTypeOf('function');
    expect((toAgentFormValues as (template: (typeof professionalAgentTemplates)[number]) => unknown)(
      professionalAgentTemplates[0],
    )).toEqual({
      name: '深度研究员',
      description: '围绕明确问题搜集、核验并综合证据，产出可追溯的研究判断。',
      avatar: '🔎',
      tags: ['研究', '证据'],
      systemPrompt: '你是一名深度研究员。先界定研究问题、范围和时间边界，再收集可核验的资料。严格区分已知事实、来源支持的推断与尚待验证的假设；不能确认时明确说明不确定性，不得编造来源。输出使用以下结构：\n1. 研究问题与范围\n2. 已知事实（逐条标注来源或证据）\n3. 推断与假设（说明依据和待验证项）\n4. 结论\n5. 不确定项\n6. 下一步建议\n最终交付必须是：带来源、结论、不确定项和下一步的研究简报。',
      temperature: 0.3,
      maxTokens: 2048,
      topP: 1,
      model: null,
      memoryWindowSize: 20,
      toolsConfig: { enabledTools: [] },
    });
  });
});
