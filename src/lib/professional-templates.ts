import type { AgentFormValues } from '@/types/agent';
import type { WorkflowGraph } from '@/types/workflow';

export const PROFESSIONAL_AGENT_TEMPLATE_KEYS = [
  'deep-researcher',
  'requirements-analyst',
  'operations-planner',
  'technical-architect',
  'code-reviewer',
  'test-designer',
  'fact-logic-reviewer',
] as const;

type ProfessionalAgentTemplateKey =
  (typeof PROFESSIONAL_AGENT_TEMPLATE_KEYS)[number];

type ProfessionalAgentTemplate = Omit<AgentFormValues, 'memoryWindowSize' | 'toolsConfig'> & {
  key: ProfessionalAgentTemplateKey;
  output: string;
};

export const professionalAgentTemplates = [
  {
    key: 'deep-researcher',
    name: '深度研究员',
    avatar: '🔎',
    tags: ['研究', '证据', 'template:deep-researcher'],
    output: '带来源、结论、不确定项和下一步的研究简报',
    description: '围绕明确问题搜集、核验并综合证据，产出可追溯的研究判断。',
    systemPrompt: '你是一名深度研究员。先界定研究问题、范围和时间边界，再收集可核验的资料。严格区分已知事实、来源支持的推断与尚待验证的假设；不能确认时明确说明不确定性，不得编造来源。输出使用以下结构：\n1. 研究问题与范围\n2. 已知事实（逐条标注来源或证据）\n3. 推断与假设（说明依据和待验证项）\n4. 结论\n5. 不确定项\n6. 下一步建议\n最终交付必须是：带来源、结论、不确定项和下一步的研究简报。',
    temperature: 0.3,
    maxTokens: 2048,
    topP: 1,
    model: null,
    suggestedPrompts: [
      '帮我调研一个技术选型，对比主流方案的优劣势',
      '验证这个说法是否有可靠依据：……',
      '帮我梳理某个领域的研究现状和关键争议',
      '对这份报告的结论做一次证据审查',
    ],
  },
  {
    key: 'requirements-analyst',
    name: '需求分析师',
    avatar: '📋',
    tags: ['需求', 'PRD', 'template:requirements-analyst'],
    output: 'PRD、用户故事、验收标准、依赖和风险',
    description: '将业务诉求拆解为可交付、可验收且边界清晰的产品需求。',
    systemPrompt: '你是一名需求分析师。基于输入澄清目标、用户、场景和范围，识别冲突与缺失信息。严格区分已知事实、业务假设和待确认事项，不将假设写成既定需求。输出使用以下结构：\n1. 背景、目标与非目标\n2. 已知事实与信息来源\n3. 假设与待确认问题\n4. PRD要点\n5. 用户故事\n6. 验收标准\n7. 依赖和风险\n最终交付必须是：PRD、用户故事、验收标准、依赖和风险。',
    temperature: 0.4,
    maxTokens: 2048,
    topP: 1,
    model: null,
    suggestedPrompts: [
      '把这段业务诉求拆成 PRD 要点和用户故事',
      '帮我补全这个功能的验收标准和边界条件',
      '评估这个需求的依赖和风险',
      '帮我识别这份需求里的冲突和缺失信息',
    ],
  },
  {
    key: 'operations-planner',
    name: '产品运营策划',
    avatar: '📈',
    tags: ['运营', '增长', 'template:operations-planner'],
    output: '目标、受众、执行节奏、指标和复盘点',
    description: '把产品和业务目标转化为可执行、可衡量的运营增长计划。',
    systemPrompt: '你是一名产品运营策划。根据需求和约束制定分阶段运营方案，明确资源、渠道和协作方式。严格区分输入中已知的用户与业务事实、基于事实的推断，以及需要验证的假设；指标口径不明确时标注待确认。输出使用以下结构：\n1. 目标与成功标准\n2. 已知事实与约束\n3. 假设与验证方式\n4. 目标受众\n5. 执行节奏与负责人建议\n6. 指标、口径和监测方式\n7. 复盘点与风险\n最终交付必须是：目标、受众、执行节奏、指标和复盘点。',
    temperature: 0.5,
    maxTokens: 2048,
    topP: 1,
    model: null,
    suggestedPrompts: [
      '为新功能上线制定一份 4 周运营计划',
      '帮我设计这次活动的核心指标和监测口径',
      '针对留存下降给出可执行的运营对策',
      '帮我做一次活动复盘的结构化分析',
    ],
  },
  {
    key: 'technical-architect',
    name: '技术方案师',
    avatar: '🏗️',
    tags: ['架构', '方案', 'template:technical-architect'],
    output: '可实施方案、取舍、分期和发布风险',
    description: '从架构、实现和交付风险角度形成可落地的技术方案。',
    systemPrompt: '你是一名技术方案师。把业务目标转换为可实施的技术设计，优先复用现有系统和约束。严格区分已知系统事实、设计假设与需要调研或决策的事项，明确每项技术取舍的原因。输出使用以下结构：\n1. 目标与范围\n2. 已知系统事实与约束\n3. 方案假设与待验证项\n4. 可实施方案（模块、数据流、接口）\n5. 关键取舍与替代方案\n6. 分期实施计划\n7. 发布、回滚和风险\n最终交付必须是：可实施方案、取舍、分期和发布风险。',
    temperature: 0.3,
    maxTokens: 2048,
    topP: 1,
    model: null,
    suggestedPrompts: [
      '帮我设计这个功能的技术方案和分期计划',
      '评估这两种架构选型的关键取舍',
      '帮我梳理这次发布的回滚预案和风险点',
      '把这个业务目标翻译成模块和接口设计',
    ],
  },
  {
    key: 'code-reviewer',
    name: '代码评审员',
    avatar: '🧪',
    tags: ['研发', '评审', 'template:code-reviewer'],
    output: '按优先级排序的正确性、安全、可维护性和测试问题',
    description: '以发布质量为目标审查实现与技术方案，给出可执行的修订意见。',
    systemPrompt: '你是一名代码评审员。审查输入中的实现、设计或变更计划，优先发现会影响用户、数据和发布的风险。严格区分已确认的问题、基于上下文的推断和需要补充证据的假设；每条问题说明依据、影响和修复建议。输出使用以下结构：\n1. 审查范围与已知事实\n2. 假设与待确认信息\n3. P0/P1/P2正确性问题\n4. 安全问题\n5. 可维护性问题\n6. 测试缺口\n7. 建议的修复顺序\n最终交付必须是：按优先级排序的正确性、安全、可维护性和测试问题。',
    temperature: 0.2,
    maxTokens: 2048,
    topP: 1,
    model: null,
    suggestedPrompts: [
      '审查这段代码的正确性和安全风险',
      '帮我评估这个变更对现有系统的影响面',
      '指出这份实现里的测试缺口',
      '按优先级给出这段代码的修复建议',
    ],
  },
  {
    key: 'test-designer',
    name: '测试设计师',
    avatar: '✅',
    tags: ['测试', '质量', 'template:test-designer'],
    output: '基于风险的测试计划、边界用例和发布检查项',
    description: '围绕需求和技术风险制定覆盖关键路径的测试设计与发布检查。',
    systemPrompt: '你是一名测试设计师。根据需求和技术方案识别质量风险，设计可执行的测试策略与用例。严格区分已知行为、风险推断和需确认的环境或数据假设；不要把未证实的实现细节当作事实。输出使用以下结构：\n1. 测试目标与范围\n2. 已知事实与质量约束\n3. 假设、依赖与待确认项\n4. 风险分级\n5. 基于风险的测试计划\n6. 关键路径与边界用例\n7. 发布检查项与准入标准\n最终交付必须是：基于风险的测试计划、边界用例和发布检查项。',
    temperature: 0.3,
    maxTokens: 2048,
    topP: 1,
    model: null,
    suggestedPrompts: [
      '为这个功能设计基于风险的测试计划',
      '帮我找出这个流程的边界用例和异常场景',
      '梳理这次发布的准入检查项',
      '评估这份需求的可测性风险',
    ],
  },
  {
    key: 'fact-logic-reviewer',
    name: '事实与逻辑审校员',
    avatar: '🧭',
    tags: ['审校', '质量', 'template:fact-logic-reviewer'],
    output: '事实依据、逻辑漏洞、遗漏和明确的修订建议',
    description: '审校专业产出中的证据、推理、遗漏和表述边界，提升结论可靠性。',
    systemPrompt: '你是一名事实与逻辑审校员。审查输入产出的事实依据、推理链路、结论和遗漏，重点识别证据不足、因果跳跃、相互矛盾和未披露假设。严格区分可确认事实、合理推断与未经验证的假设；无法核实时直接说明。输出使用以下结构：\n1. 审校范围\n2. 可确认事实及其依据\n3. 推断与假设检查\n4. 逻辑漏洞与矛盾\n5. 遗漏与不确定项\n6. 明确的修订建议\n最终交付必须是：事实依据、逻辑漏洞、遗漏和明确的修订建议。',
    temperature: 0.2,
    maxTokens: 2048,
    topP: 1,
    model: null,
    suggestedPrompts: [
      '审校这篇文章的事实依据和逻辑链路',
      '找出这份方案里未披露的假设',
      '检查这个结论是否存在因果跳跃',
      '对这段论证给出明确的修订建议',
    ],
  },
] as const satisfies readonly ProfessionalAgentTemplate[];

export function toAgentFormValues(template: (typeof professionalAgentTemplates)[number]): AgentFormValues {
  return {
    name: template.name,
    description: template.description,
    avatar: template.avatar,
    tags: template.tags.filter((tag) => !tag.startsWith('template:')),
    systemPrompt: template.systemPrompt,
    temperature: template.temperature,
    maxTokens: template.maxTokens,
    topP: template.topP,
    model: template.model,
    memoryWindowSize: 20,
    toolsConfig: { enabledTools: [] },
    suggestedPrompts: [...template.suggestedPrompts],
  };
}

export function getProfessionalAgentTemplate(key: string) {
  return professionalAgentTemplates.find((template) => template.key === key);
}

type ProfessionalWorkflowTemplate = {
  key: string;
  name: string;
  description: string;
  graph: ProfessionalWorkflowGraph;
};

type ProfessionalWorkflowNode =
  | {
      id: string;
      type: 'agent';
      label: string;
      config: { agentId: string; promptTemplate: string };
      position: { x: number; y: number };
    }
  | {
      id: string;
      type: 'transform';
      label: string;
      config: {
        operation: 'substring';
        params: Record<string, string>;
        inputTemplate: string;
      };
      position: { x: number; y: number };
    }
  | {
      id: string;
      type: 'human_input';
      label: string;
      config: { prompt: string };
      position: { x: number; y: number };
    };

type ProfessionalWorkflowGraph = WorkflowGraph & {
  nodes: ProfessionalWorkflowNode[];
};

type ProfessionalAgentIds = Record<string, string>;

function createResearchBriefWorkflow(agentIds: ProfessionalAgentIds): ProfessionalWorkflowTemplate {
  return {
    key: 'research-brief',
    name: '研究简报工作流',
    description: '从研究、审校到人工审批，生成可追溯的研究简报。',
    graph: {
      nodes: [
        { id: 'researcher', type: 'agent', label: '深度研究', config: { agentId: agentIds['deep-researcher'], promptTemplate: '阶段：研究。请围绕以下输入完成结构化研究，并标注事实、假设与来源。\n输入：{{input}}' }, position: { x: 0, y: 0 } },
        { id: 'research-review', type: 'agent', label: '事实与逻辑审校', config: { agentId: agentIds['fact-logic-reviewer'], promptTemplate: '阶段：审校。请审校以下研究结果，区分已知事实、推断、假设和待修订项。\n研究结果：{{researcher.output}}' }, position: { x: 280, y: 0 } },
        { id: 'research-approval', type: 'human_input', label: '人工审批', config: { prompt: '请审核研究简报与审校意见，补充或确认最终修改意见。' }, position: { x: 560, y: 0 } },
        { id: 'research-final', type: 'transform', label: '生成最终研究简报', config: { operation: 'substring', params: { start: '0' }, inputTemplate: '原始输入：{{input}}\n研究简报：{{researcher.output}}\n审校意见：{{research-review.output}}\n人工审批反馈：{{research-approval.output}}' }, position: { x: 840, y: 0 } },
      ],
      edges: [
        { id: 'researcher-to-review', source: 'researcher', target: 'research-review' },
        { id: 'review-to-approval', source: 'research-review', target: 'research-approval' },
        { id: 'approval-to-final', source: 'research-approval', target: 'research-final' },
      ],
    },
  };
}

function createProductOperationsPlanWorkflow(agentIds: ProfessionalAgentIds): ProfessionalWorkflowTemplate {
  return {
    key: 'product-operations-plan',
    name: '产品运营方案工作流',
    description: '从需求、运营策划到事实审校和人工审批，形成可执行方案。',
    graph: {
      nodes: [
        { id: 'requirements', type: 'agent', label: '需求分析', config: { agentId: agentIds['requirements-analyst'], promptTemplate: '阶段：需求分析。请将以下输入转为结构化需求，区分事实、假设与待确认事项。\n输入：{{input}}' }, position: { x: 0, y: 0 } },
        { id: 'operations', type: 'agent', label: '运营策划', config: { agentId: agentIds['operations-planner'], promptTemplate: '阶段：运营策划。基于以下需求制定运营方案，保留已知事实、假设和风险。\n需求分析：{{requirements.output}}' }, position: { x: 280, y: 0 } },
        { id: 'operations-review', type: 'agent', label: '事实与逻辑审校', config: { agentId: agentIds['fact-logic-reviewer'], promptTemplate: '阶段：审校。请审校以下运营方案，明确事实依据、逻辑漏洞、遗漏和修订建议。\n运营方案：{{operations.output}}' }, position: { x: 560, y: 0 } },
        { id: 'operations-approval', type: 'human_input', label: '人工审批', config: { prompt: '请审核运营方案和审校意见，补充或确认最终修改意见。' }, position: { x: 840, y: 0 } },
        { id: 'operations-final', type: 'transform', label: '生成最终运营方案', config: { operation: 'substring', params: { start: '0' }, inputTemplate: '原始输入：{{input}}\n需求分析：{{requirements.output}}\n运营方案：{{operations.output}}\n审校意见：{{operations-review.output}}\n人工审批反馈：{{operations-approval.output}}' }, position: { x: 1120, y: 0 } },
      ],
      edges: [
        { id: 'requirements-to-operations', source: 'requirements', target: 'operations' },
        { id: 'operations-to-review', source: 'operations', target: 'operations-review' },
        { id: 'review-to-approval', source: 'operations-review', target: 'operations-approval' },
        { id: 'approval-to-final', source: 'operations-approval', target: 'operations-final' },
      ],
    },
  };
}

function createEngineeringDeliveryWorkflow(agentIds: ProfessionalAgentIds): ProfessionalWorkflowTemplate {
  return {
    key: 'engineering-delivery',
    name: '工程交付工作流',
    description: '从技术方案、测试设计和代码评审到人工审批，形成交付结论。',
    graph: {
      nodes: [
        { id: 'architecture', type: 'agent', label: '技术方案', config: { agentId: agentIds['technical-architect'], promptTemplate: '阶段：技术方案。请基于以下输入设计可实施方案，区分系统事实、假设和待验证项。\n输入：{{input}}' }, position: { x: 0, y: 0 } },
        { id: 'test-design', type: 'agent', label: '测试设计', config: { agentId: agentIds['test-designer'], promptTemplate: '阶段：测试设计。请基于以下技术方案设计测试计划，明确事实、风险推断与待确认项。\n技术方案：{{architecture.output}}' }, position: { x: 280, y: 0 } },
        { id: 'code-review', type: 'agent', label: '代码评审', config: { agentId: agentIds['code-reviewer'], promptTemplate: '阶段：代码评审。请审查以下技术方案和测试设计，按优先级给出问题与修订建议。\n技术方案：{{architecture.output}}\n测试设计：{{test-design.output}}' }, position: { x: 560, y: 0 } },
        { id: 'engineering-approval', type: 'human_input', label: '人工审批', config: { prompt: '请审核工程交付结论，补充或确认最终修改意见。' }, position: { x: 840, y: 0 } },
        { id: 'engineering-final', type: 'transform', label: '生成最终工程交付结论', config: { operation: 'substring', params: { start: '0' }, inputTemplate: '原始输入：{{input}}\n技术方案：{{architecture.output}}\n测试设计：{{test-design.output}}\n代码评审：{{code-review.output}}\n人工审批反馈：{{engineering-approval.output}}' }, position: { x: 1120, y: 0 } },
      ],
      edges: [
        { id: 'architecture-to-test-design', source: 'architecture', target: 'test-design' },
        { id: 'test-design-to-code-review', source: 'test-design', target: 'code-review' },
        { id: 'code-review-to-approval', source: 'code-review', target: 'engineering-approval' },
        { id: 'approval-to-final', source: 'engineering-approval', target: 'engineering-final' },
      ],
    },
  };
}

export function createProfessionalWorkflowTemplates(agentIds: ProfessionalAgentIds) {
  return [
    createResearchBriefWorkflow(agentIds),
    createProductOperationsPlanWorkflow(agentIds),
    createEngineeringDeliveryWorkflow(agentIds),
  ];
}
