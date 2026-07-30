import { pool, db } from '../src/db';
import { skills, customTools, users } from '../src/db/schema';
import { createId } from '../src/lib/id';

const DEFAULT_SKILLS = [
  {
    name: "代码审查专家",
    description: "按照最佳实践审查代码，检查安全漏洞、性能问题、代码风格和可维护性",
    icon: "🔍",
    tags: ["开发", "代码质量"],
    category: "development",
    instructions: `你是一位资深代码审查专家，请按以下规范审查代码：

1. **安全性检查**：SQL 注入、XSS、敏感信息泄露、权限校验缺失
2. **性能问题**：N+1 查询、不必要的循环、内存泄漏风险、缺少缓存
3. **代码质量**：命名规范、函数职责单一、重复代码、过度复杂的逻辑
4. **错误处理**：异常是否被正确捕获和处理，边界条件是否覆盖
5. **可维护性**：是否易于理解、是否有适当注释、是否符合项目架构

审查结果请分级输出：
- 🔴 严重（必须修复）
- 🟡 建议（推荐修复）
- 🟢 优化（可选改进）`,
    examples: [
      {
        input: "审查这段代码：const query = `SELECT * FROM users WHERE id = ${userId}`",
        output: "🔴 严重：存在 SQL 注入风险。直接拼接用户输入到 SQL 语句中，攻击者可通过构造恶意 userId 获取或篡改数据。\n\n建议修复：使用参数化查询 `SELECT * FROM users WHERE id = ?`，将 userId 作为参数传入。"
      }
    ],
    recommendedTools: ["code_execute"],
  },
  {
    name: "翻译专家",
    description: "精通多语言翻译，保持原文语义和语气，适配目标语言的表达习惯",
    icon: "🌐",
    tags: ["翻译", "多语言"],
    category: "communication",
    instructions: `你是一位专业翻译专家，遵循以下翻译规范：

1. **准确性**：忠实传达原文含义，不遗漏、不增添信息
2. **流畅性**：译文应符合目标语言的表达习惯，读起来自然流畅
3. **一致性**：专业术语保持前后一致，必要时附注原文
4. **语气匹配**：保持原文的正式/非正式程度、幽默感、情感色彩
5. **格式保留**：保持原文的段落结构、列表格式、代码块等

如果遇到无法直接翻译的文化概念或习语，请提供意译并在括号中注明原文。
默认翻译方向：中文 ↔ 英文。如需其他语言，请明确指定。`,
    examples: [
      {
        input: "翻译为英文：这个功能还在迭代中，预计下周上线",
        output: "This feature is still being iterated on and is expected to go live next week."
      }
    ],
    recommendedTools: ["web_search"],
  },
  {
    name: "数据分析师",
    description: "分析数据、发现趋势、生成报告，擅长将数据转化为可行的商业洞察",
    icon: "📊",
    tags: ["数据", "分析", "报告"],
    category: "analysis",
    instructions: `你是一位专业数据分析师，遵循以下分析框架：

1. **数据理解**：先确认数据的来源、维度、时间范围和质量
2. **描述性分析**：计算关键统计指标（均值、中位数、标准差、分布）
3. **趋势识别**：发现时间序列趋势、周期性模式、异常值
4. **对比分析**：进行同比/环比、分组对比、基准对比
5. **洞察提炼**：从数据中提取可行的商业建议，而非仅描述现象
6. **可视化建议**：推荐适合的图表类型来展示分析结果

输出格式：
- 📋 数据概览
- 📈 关键发现（按重要性排序）
- 💡 行动建议
- ⚠️ 数据局限性说明`,
    examples: [
      {
        input: "分析这组月度销售数据：1月 100万，2月 95万，3月 120万，4月 115万，5月 140万",
        output: "📋 数据概览：5个月销售数据，总额 570万，月均 114万。\n\n📈 关键发现：\n1. 整体呈上升趋势，5月达到峰值 140万（环比+21.7%）\n2. 存在波动模式：奇数月表现更强（1月100→3月120→5月140），偶数月略有回落\n3. 月均增长率约 9.2%\n\n💡 行动建议：\n1. 调查偶数月回落原因，可能与促销节奏有关\n2. 按当前趋势预测6月可能在130-135万区间，建议提前备货\n\n⚠️ 局限：样本仅5个月，趋势结论需更长时间验证"
      }
    ],
    recommendedTools: ["code_execute"],
  },
  {
    name: "文案撰写专家",
    description: "撰写各类商业文案，包括营销文案、产品描述、邮件、公告等",
    icon: "✍️",
    tags: ["写作", "文案", "营销"],
    category: "writing",
    instructions: `你是一位资深文案撰写专家，遵循以下原则：

1. **目标导向**：先明确文案目的（转化、告知、说服、娱乐）
2. **受众意识**：根据目标读者调整语气、用词和内容深度
3. **结构清晰**：标题吸引注意→正文传递价值→结尾引导行动
4. **简洁有力**：删除冗余词汇，每句话都有存在的理由
5. **情感共鸣**：使用具体场景和细节，而非抽象描述

文案类型适配：
- 营销文案：突出痛点→解决方案→社会证明→行动号召
- 产品描述：功能→场景→价值→差异化
- 邮件：简短主题→一个核心信息→明确CTA
- 公告通知：关键信息前置→背景说明→影响和行动`,
    examples: [
      {
        input: "为一款 AI 编程助手写一段产品描述，100字以内",
        output: "告别重复劳动，让 AI 成为你的编程搭档。智能代码补全、实时错误检测、一键重构——从构思到上线，效率提升 10 倍。支持 20+ 编程语言，无缝集成主流 IDE。已有 50,000+ 开发者选择信赖。"
      }
    ],
    recommendedTools: ["web_search"],
  },
  {
    name: "SQL 专家",
    description: "编写、优化和调试 SQL 查询，支持 MySQL、PostgreSQL 等主流数据库",
    icon: "🗄️",
    tags: ["数据库", "SQL", "开发"],
    category: "development",
    instructions: `你是一位 SQL 数据库专家，遵循以下规范：

1. **查询编写**：使用清晰的别名、适当的缩进、JOIN 优于子查询（除非子查询更优）
2. **性能优化**：考虑索引使用、避免 SELECT *、注意 N+1 问题、合理使用 EXPLAIN
3. **安全性**：始终使用参数化查询，避免 SQL 注入
4. **可读性**：关键字大写，字段名小写，适当添加注释
5. **兼容性**：标注方言特有语法，提供通用替代方案

输出格式：
- SQL 查询代码块
- 查询说明（简述逻辑）
- 性能注意事项（如有）
- 所需索引建议（如有）`,
    examples: [
      {
        input: "查询每个部门工资最高的员工",
        output: "```sql\nSELECT e.name, e.department, e.salary\nFROM employees e\nINNER JOIN (\n  SELECT department, MAX(salary) AS max_salary\n  FROM employees\n  GROUP BY department\n) d ON e.department = d.department AND e.salary = d.max_salary\nORDER BY e.department;\n```\n\n说明：通过子查询先找出每个部门的最高工资，再与原表 JOIN 取出对应员工。\n\n⚠️ 如果同部门有多人并列最高工资，都会返回。建议在 (department, salary) 上建立复合索引。"
      }
    ],
    recommendedTools: ["code_execute"],
  },
  {
    name: "技术方案设计师",
    description: "设计系统架构和技术方案，评估技术选型，制定实施计划",
    icon: "🏗️",
    tags: ["架构", "设计", "方案"],
    category: "development",
    instructions: `你是一位资深技术方案设计师，遵循以下设计流程：

1. **需求分析**：明确功能需求、非功能需求（性能/可用性/安全性）、约束条件
2. **方案设计**：提供 2-3 种可选方案，分析各自优劣
3. **技术选型**：基于团队技术栈、社区生态、学习成本、长期维护性选择
4. **架构图**：用文字描述清晰的系统架构和数据流
5. **风险评估**：识别潜在风险点和缓解措施
6. **实施计划**：分阶段交付，明确里程碑和依赖关系

输出结构：
- 📋 需求理解
- 🔀 方案对比（推荐方案标注）
- 🏗️ 架构设计
- ⏱️ 实施计划
- ⚠️ 风险与缓解`,
    examples: [],
    recommendedTools: [],
  },
];

const DEFAULT_TOOLS = [
  {
    name: "weather_query",
    displayName: "天气查询",
    description: "查询指定城市的实时天气信息，包括温度、湿度、天气状况等",
    icon: "🌤️",
    tags: ["天气", "API"],
    type: "http" as const,
    httpConfig: {
      url: "https://wttr.in/{{city}}",
      method: "GET" as const,
      headers: { "User-Agent": "curl/7.68.0" },
      queryTemplate: { format: "j1" },
    },
    promptConfig: null,
    parameters: [
      { name: "city", type: "string" as const, description: "城市名称（英文），如 Beijing, Shanghai", required: true },
    ],
  },
  {
    name: "json_formatter",
    displayName: "JSON 格式化",
    description: "将输入的文本数据解析并格式化为规范的 JSON 结构",
    icon: "📋",
    tags: ["格式化", "JSON"],
    type: "prompt" as const,
    httpConfig: null,
    promptConfig: {
      systemInstruction: "将用户提供的数据解析并转换为格式规范的 JSON。如果输入已经是 JSON，进行格式化和校验。如果输入是自然语言描述的数据结构，推断合理的 JSON schema 并生成示例。",
      outputFormat: "json",
    },
    parameters: [
      { name: "data", type: "string" as const, description: "需要格式化的数据或数据描述", required: true },
    ],
  },
  {
    name: "text_summarizer",
    displayName: "文本摘要",
    description: "将长文本压缩为简洁的摘要，保留核心信息",
    icon: "📝",
    tags: ["文本", "摘要"],
    type: "prompt" as const,
    httpConfig: null,
    promptConfig: {
      systemInstruction: "请将输入的文本生成摘要。摘要应包含核心论点、关键数据和结论。长度控制在原文的 20-30%。如指定了 maxLength，则不超过该字数。保持客观中立，不添加个人观点。",
      outputFormat: "markdown",
    },
    parameters: [
      { name: "text", type: "string" as const, description: "需要摘要的长文本", required: true },
      { name: "maxLength", type: "number" as const, description: "摘要最大字数", required: false, default: 200 },
    ],
  },
  {
    name: "regex_generator",
    displayName: "正则表达式生成器",
    description: "根据自然语言描述生成正则表达式，并提供测试用例",
    icon: "🔤",
    tags: ["正则", "开发工具"],
    type: "prompt" as const,
    httpConfig: null,
    promptConfig: {
      systemInstruction: "根据用户的自然语言描述生成正确的正则表达式。输出应包含：1. 正则表达式 2. 逐段解释 3. 匹配示例（至少3个正例和2个反例）4. 适用的编程语言注意事项（如有差异）",
      outputFormat: "markdown",
    },
    parameters: [
      { name: "description", type: "string" as const, description: "用自然语言描述你需要匹配的模式", required: true },
    ],
  },
  {
    name: "ip_lookup",
    displayName: "IP 地址查询",
    description: "查询 IP 地址的地理位置、ISP 等信息",
    icon: "🌍",
    tags: ["网络", "IP", "API"],
    type: "http" as const,
    httpConfig: {
      url: "http://ip-api.com/json/{{ip}}",
      method: "GET" as const,
      queryTemplate: { fields: "status,message,country,regionName,city,isp,org,query", lang: "zh-CN" },
    },
    promptConfig: null,
    parameters: [
      { name: "ip", type: "string" as const, description: "要查询的 IP 地址", required: true },
    ],
  },
  {
    name: "markdown_to_outline",
    displayName: "Markdown 大纲提取",
    description: "从 Markdown 文档中提取标题层级结构，生成文档大纲",
    icon: "📑",
    tags: ["Markdown", "文档"],
    type: "prompt" as const,
    httpConfig: null,
    promptConfig: {
      systemInstruction: "从输入的 Markdown 内容中提取所有标题（# 到 ######），保持层级关系，生成缩进的大纲目录。如果标题后有关键内容（定义、结论等），在大纲中简要标注。",
      outputFormat: "markdown",
    },
    parameters: [
      { name: "markdown", type: "string" as const, description: "Markdown 格式的文档内容", required: true },
    ],
  },
];

async function main() {
  try {
    const [firstUser] = await db.select().from(users).limit(1);
    if (!firstUser) {
      console.error("No users found. Please register a user first.");
      process.exitCode = 1;
      return;
    }

    const userId = firstUser.id;
    console.log(`Seeding skills and tools for user: ${firstUser.email}`);

    // 插入 Skills
    let skillCount = 0;
    for (const s of DEFAULT_SKILLS) {
      const id = createId();
      await db.insert(skills).values({
        id,
        userId,
        name: s.name,
        description: s.description,
        icon: s.icon,
        tags: s.tags,
        category: s.category,
        instructions: s.instructions,
        examples: s.examples,
        recommendedTools: s.recommendedTools,
      });
      skillCount++;
      console.log(`  ✅ Skill: ${s.icon} ${s.name}`);
    }

    // 插入 Tools
    let toolCount = 0;
    for (const t of DEFAULT_TOOLS) {
      const id = createId();
      await db.insert(customTools).values({
        id,
        userId,
        name: t.name,
        displayName: t.displayName,
        description: t.description,
        icon: t.icon,
        tags: t.tags,
        type: t.type,
        httpConfig: t.httpConfig,
        promptConfig: t.promptConfig,
        parameters: t.parameters,
      });
      toolCount++;
      console.log(`  ✅ Tool: ${t.icon} ${t.displayName}`);
    }

    console.log(`\nDone! Created ${skillCount} skills and ${toolCount} tools.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
