/**
 * 一键初始化：账号 → 专业 Agent → 工作流 → 知识库（含文档索引）→ Agent×知识库关联 → Skills/Tools 及关联。
 *
 * 直连数据库执行（无需启动 dev server、无需登录态）。
 * 运行：pnpm run init:all
 * （package.json 已配置 dotenv 注入 .env.local 的 DATABASE_URL）
 *
 * 设计原则：**非破坏式、幂等**。
 *   - 已存在的用户/Agent/工作流/知识库/文档一律跳过，不清空任何对话或运行记录。
 *   - 与 templates:reset（会清空全部数据后重建）不同，本脚本可在已有数据的库上安全重跑。
 *
 * 可选环境变量：
 *   INIT_ADMIN_EMAIL / INIT_ADMIN_PASSWORD  users 表为空时用于创建首个 superAdmin
 *   INIT_SKIP_INDEX=1                       只登记文档不做 embedding 索引
 *                                           （适合 embedding 配额紧张时，稍后在 UI"重新索引"）
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, pool } from "@/db";
import { users, agents, workflows, knowledgeDocuments, skills, customTools, agentSkills, agentCustomTools } from "@/db/schema";
import {
  professionalAgentTemplates,
  createProfessionalWorkflowTemplates,
} from "@/lib/professional-templates";
import { createId } from "@/lib/id";
import { createUser } from "@/server/users";
import { getProviderConfig } from "@/server/provider-config";
import { createKnowledgeBase, listKnowledgeBases } from "@/server/knowledge-bases";
import { createKnowledgeDocument, listDocuments, updateDocumentStatus } from "@/server/knowledge-documents";
import { setAgentKnowledgeBases } from "@/server/agent-knowledge";
import { setAgentSkills } from "@/server/agent-skills";
import { setAgentCustomTools } from "@/server/agent-custom-tools";
import { saveFile } from "@/lib/files/storage";
import { indexDocument } from "@/lib/knowledge/indexer";

const SEED_DIR = path.join(process.cwd(), "knowledge-seed");
const SKIP_INDEX = process.env.INIT_SKIP_INDEX === "1";
const KB_CHUNK_SIZE = 800;
const KB_CHUNK_OVERLAP = 100;

/** 目录名（去数字前缀）→ 知识库描述 */
const KB_DESCRIPTIONS: Record<string, string> = {
  工程规范库: "编码规范、代码评审清单、Git 与提交规范、API 设计准则——建议挂载给「代码评审员」「技术方案师」。",
  测试与质量库: "测试设计方法论、用例模板、缺陷分级、发布准入清单——建议挂载给「测试设计师」。",
  需求与产品库: "PRD 模板、用户故事与验收标准、需求优先级框架——建议挂载给「需求分析师」「产品运营策划」。",
  架构与技术选型库: "架构决策记录 ADR、技术选型对比方法、非功能性需求清单——建议挂载给「技术方案师」「深度研究员」。",
};

/** Agent 名称 → 关联知识库名称 */
const AGENT_KB_MAPPING: Record<string, string[]> = {
  深度研究员: ["架构与技术选型库"],
  需求分析师: ["需求与产品库"],
  产品运营策划: ["需求与产品库"],
  技术方案师: ["架构与技术选型库", "工程规范库"],
  代码评审员: ["工程规范库"],
  测试设计师: ["测试与质量库"],
};

/** Agent 名称 → 关联 Skill 名称 */
const AGENT_SKILL_MAPPING: Record<string, string[]> = {
  代码评审员: ["代码审查专家", "SQL 专家"],
  技术方案师: ["技术方案设计师", "SQL 专家"],
  深度研究员: ["数据分析师"],
  产品运营策划: ["文案撰写专家"],
  需求分析师: ["文案撰写专家"],
  事实与逻辑审校员: ["代码审查专家", "SQL 专家", "翻译专家", "数据分析师", "技术方案设计师", "文案撰写专家"],
};

/** Agent 名称 → 关联 Tool name */
const AGENT_TOOL_MAPPING: Record<string, string[]> = {
  代码评审员: ["regex_generator"],
  技术方案师: ["ip_lookup"],
  深度研究员: ["weather_query", "ip_lookup"],
  事实与逻辑审校员: ["weather_query", "ip_lookup", "json_formatter", "text_summarizer", "regex_generator", "markdown_to_outline"],
};

function isRateLimitError(err: unknown): boolean {
  const text = [
    err instanceof Error ? err.message : String(err),
    (err as { responseBody?: string })?.responseBody ?? "",
  ].join(" ");
  return /IRC-001|429|rate.?limit|超过了/i.test(text);
}

async function ensureUser(): Promise<{ id: string; email: string }> {
  const [existing] = await db.select().from(users).limit(1);
  if (existing) {
    console.log(`✅ 用户已存在：${existing.email}`);
    return existing;
  }
  const email = process.env.INIT_ADMIN_EMAIL;
  const password = process.env.INIT_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "users 表为空。请设置 INIT_ADMIN_EMAIL 与 INIT_ADMIN_PASSWORD 以创建首个 superAdmin 账号。",
    );
  }
  const admin = await createUser({
    email: email.toLowerCase().trim(),
    password,
    name: "Super Admin",
    role: "superAdmin",
  });
  console.log(`＋ 已创建 superAdmin：${admin!.email}`);
  return admin!;
}

/** 按名称补齐缺失的专业 Agent，返回 模板key → agentId 完整映射。 */
async function ensureAgents(userId: string): Promise<Record<string, string>> {
  const existing = await db.select().from(agents).where(eq(agents.userId, userId));
  const byName = new Map(existing.map((a) => [a.name, a.id]));
  const agentIds: Record<string, string> = {};

  for (const template of professionalAgentTemplates) {
    const found = byName.get(template.name);
    if (found) {
      agentIds[template.key] = found;
      console.log(`  ✅ Agent 已存在：${template.name}`);
      continue;
    }
    const { key, output, tags, ...input } = template;
    void output;
    const id = createId();
    await db.insert(agents).values({ ...input, tags: [...tags], id, userId });
    agentIds[key] = id;
    console.log(`  ＋ 已创建 Agent：${template.name}`);
  }
  return agentIds;
}

async function ensureWorkflows(userId: string, agentIds: Record<string, string>) {
  const existing = await db.select().from(workflows).where(eq(workflows.userId, userId));
  const existingNames = new Set(existing.map((w) => w.name));
  for (const wf of createProfessionalWorkflowTemplates(agentIds as never)) {
    if (existingNames.has(wf.name)) {
      console.log(`  ✅ 工作流已存在：${wf.name}`);
      continue;
    }
    await db.insert(workflows).values({ id: createId(), userId, name: wf.name, description: wf.description, graph: wf.graph });
    console.log(`  ＋ 已创建工作流：${wf.name}`);
  }
}

async function ensureKnowledge(userId: string): Promise<Map<string, string>> {
  const kbIdByName = new Map<string, string>();
  const existing = await listKnowledgeBases(userId);
  for (const kb of existing) kbIdByName.set(kb.name, kb.id);

  let folders: string[] = [];
  try {
    folders = (await readdir(SEED_DIR, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    console.warn(`  ⚠️  未找到 ${SEED_DIR}，跳过知识库内容导入`);
    return kbIdByName;
  }

  let rateLimited = false;
  for (const folder of folders) {
    const name = folder.replace(/^\d+[-_]?/, "");
    let kbId = kbIdByName.get(name);
    if (kbId) {
      console.log(`  ✅ 知识库已存在：${name}`);
    } else {
      const kb = await createKnowledgeBase(
        { name, description: KB_DESCRIPTIONS[name] ?? "", chunkSize: KB_CHUNK_SIZE, chunkOverlap: KB_CHUNK_OVERLAP },
        userId,
      );
      kbId = kb!.id;
      kbIdByName.set(name, kbId);
      console.log(`  ＋ 已创建知识库：${name}`);
    }

    const dir = path.join(SEED_DIR, folder);
    const files = (await readdir(dir)).filter((f) => f.toLowerCase().endsWith(".md"));
    const docs = await listDocuments(kbId);
    const docNames = new Set(docs.map((d) => d.filename));

    for (const filename of files) {
      if (docNames.has(filename)) {
        console.log(`    ✅ 文档已存在：${filename}`);
        continue;
      }
      const buffer = await readFile(path.join(dir, filename));
      const storagePath = await saveFile(filename, buffer);
      const doc = await createKnowledgeDocument({
        knowledgeBaseId: kbId,
        filename,
        mimetype: "text/markdown",
        size: buffer.length,
        storagePath,
      });
      if (SKIP_INDEX || rateLimited) {
        // 不消耗 embedding 配额；标记 failed 并注明原因，UI 上可一键"重新索引"。
        await updateDocumentStatus(doc!.id, "failed", undefined, "初始化时跳过索引，请稍后重新索引");
        console.log(`    ↳ 已登记（未索引）：${filename}`);
        continue;
      }
      try {
        await indexDocument(doc!.id); // 串行索引，避免并发打爆限流
        console.log(`    ↑ 已上传并索引：${filename}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Indexing failed";
        // 预检类错误（如未配置 embedding）不会写 failed 状态，这里统一兜底写入，UI 可见原因。
        await updateDocumentStatus(doc!.id, "failed", undefined, message).catch(() => {});
        if (isRateLimitError(err)) {
          rateLimited = true;
          console.warn(`    ✗ 索引触发限流：${filename}。后续文档将只登记不索引，稍后在 UI 重新索引。`);
        } else {
          console.warn(`    ✗ 索引失败：${filename}（${message}）`);
        }
      }
    }
  }
  return kbIdByName;
}

async function linkAgents(userId: string, agentIds: Record<string, string>, kbIdByName: Map<string, string>) {
  const nameByKey = new Map<string, string>(professionalAgentTemplates.map((t) => [t.name, t.key]));
  for (const [agentName, kbNames] of Object.entries(AGENT_KB_MAPPING)) {
    const key = nameByKey.get(agentName);
    const agentId = key ? agentIds[key] : undefined;
    if (!agentId) {
      console.warn(`  ⚠️  未找到 Agent「${agentName}」，跳过关联`);
      continue;
    }
    const ids = kbNames.map((n) => kbIdByName.get(n)).filter((id): id is string => Boolean(id));
    if (ids.length === 0) continue;
    await setAgentKnowledgeBases(agentId, ids, userId);
    console.log(`  🔗 ${agentName} → ${kbNames.join("、")}`);
  }
}

/** 幂等创建默认 Skills，返回 name → id 映射。 */
async function ensureSkills(userId: string): Promise<Map<string, string>> {
  const existing = await db.select({ id: skills.id, name: skills.name }).from(skills).where(eq(skills.userId, userId));
  const byName = new Map(existing.map((s) => [s.name, s.id]));

  const defaultSkills: Array<{ name: string; description: string; icon: string; tags: string[]; category: string; version: string; argumentHint: string; content: string }> = [
    {
      name: "代码审查专家",
      description: "按照安全性、性能、代码质量等维度审查代码，输出分级审查意见",
      icon: "🔍",
      tags: ["开发", "代码质量"],
      category: "development",
      version: "1.0.0",
      argumentHint: "<代码片段或文件路径>",
      content: `# 代码审查专家\n\n按照最佳实践审查代码，检查安全漏洞、性能问题、代码风格和可维护性。\n\n## 审查维度\n\n### 1. 安全性检查\n- SQL 注入、XSS、敏感信息泄露、权限校验缺失\n\n### 2. 性能问题\n- N+1 查询、不必要的循环、内存泄漏风险、缺少缓存\n\n### 3. 代码质量\n- 命名规范、函数职责单一、重复代码、过度复杂的逻辑\n\n### 4. 错误处理\n- 异常是否被正确捕获和处理、边界条件是否覆盖\n\n### 5. 可维护性\n- 是否易于理解、是否符合项目架构\n\n## 输出格式\n\n审查结果按严重程度分级：\n- 🔴 **严重**（必须修复）\n- 🟡 **建议**（推荐修复）\n- 🟢 **优化**（可选改进）`,
    },
    {
      name: "翻译专家",
      description: "精通多语言翻译，保持原文语义和语气，适配目标语言表达习惯",
      icon: "🌐",
      tags: ["翻译", "多语言"],
      category: "communication",
      version: "1.0.0",
      argumentHint: "<待翻译文本>",
      content: `# 翻译专家\n\n精通多语言翻译，保持原文语义和语气，适配目标语言的表达习惯。\n\n## 翻译规范\n\n1. **准确性**：忠实传达原文含义，不遗漏、不增添\n2. **流畅性**：译文符合目标语言表达习惯\n3. **一致性**：专业术语前后一致，必要时附注原文\n4. **语气匹配**：保持正式/非正式程度\n5. **格式保留**：保持段落结构、列表格式、代码块\n\n## 默认行为\n\n- 默认翻译方向：中文 ↔ 英文\n- 如需其他语言请明确指定`,
    },
    {
      name: "数据分析师",
      description: "分析数据、发现趋势、生成洞察报告",
      icon: "📊",
      tags: ["数据", "分析"],
      category: "analysis",
      version: "1.0.0",
      argumentHint: "<数据描述或数据集>",
      content: `# 数据分析师\n\n分析数据、发现趋势、生成报告，将数据转化为可行的商业洞察。\n\n## 分析框架\n\n### Step 1: 数据理解\n确认数据来源、维度、时间范围和质量\n\n### Step 2: 描述性分析\n计算关键统计指标\n\n### Step 3: 趋势识别\n时间序列趋势、周期性模式、异常值\n\n### Step 4: 洞察提炼\n从数据中提取可行的商业建议\n\n## 输出格式\n\n- 📋 数据概览\n- 📈 关键发现\n- 💡 行动建议\n- ⚠️ 数据局限性`,
    },
    {
      name: "技术方案设计师",
      description: "设计系统架构和技术方案，评估选型，制定实施计划",
      icon: "🏗️",
      tags: ["架构", "设计"],
      category: "development",
      version: "1.0.0",
      argumentHint: "<需求描述或技术问题>",
      content: `# 技术方案设计师\n\n设计系统架构和技术方案，评估技术选型，制定实施计划。\n\n## 设计流程\n\n### 1. 需求分析\n明确功能需求、非功能需求、约束条件\n\n### 2. 方案设计\n提供 2-3 种可选方案，分析优劣\n\n### 3. 技术选型\n基于团队技术栈、社区生态、学习成本评估\n\n### 4. 架构设计\n系统架构图、数据流、接口定义\n\n### 5. 风险评估\n识别潜在风险和缓解措施\n\n## 输出结构\n\n- 📋 需求理解\n- 🔀 方案对比（推荐标注 ✅）\n- 🏗️ 架构设计\n- ⏱️ 实施计划\n- ⚠️ 风险与缓解`,
    },
    {
      name: "文案撰写专家",
      description: "撰写各类商业文案：营销、产品描述、邮件、公告等",
      icon: "✍️",
      tags: ["写作", "文案"],
      category: "writing",
      version: "1.0.0",
      argumentHint: "<文案需求描述>",
      content: `# 文案撰写专家\n\n撰写各类商业文案。\n\n## 写作原则\n\n1. **目标导向**：明确文案目的\n2. **受众意识**：调整语气和内容深度\n3. **结构清晰**：标题→正文→行动\n4. **简洁有力**：删除冗余\n5. **情感共鸣**：使用具体场景\n\n## 文案类型\n\n| 类型 | 结构 |\n|------|------|\n| 营销 | 痛点→方案→证明→CTA |\n| 产品 | 功能→场景→价值→差异化 |\n| 邮件 | 主题→核心信息→CTA |\n| 公告 | 关键信息→背景→行动 |`,
    },
    {
      name: "SQL 专家",
      description: "编写、优化和调试 SQL 查询",
      icon: "🗄️",
      tags: ["数据库", "SQL"],
      category: "development",
      version: "1.0.0",
      argumentHint: "<SQL 需求或待优化查询>",
      content: `# SQL 专家\n\n编写、优化和调试 SQL 查询，支持 MySQL、PostgreSQL 等。\n\n## 编写规范\n\n1. 关键字大写，字段名小写\n2. 优先 JOIN，避免子查询（除非更优）\n3. 始终使用参数化查询\n4. 标注方言差异\n\n## 输出格式\n\n1. SQL 查询（代码块）\n2. 逻辑说明\n3. 性能注意事项\n4. 建议索引\n\n## 优化检查清单\n\n- [ ] 是否使用了 SELECT *？\n- [ ] WHERE 条件是否命中索引？\n- [ ] 是否存在 N+1 查询？\n- [ ] 大表是否有分页？\n- [ ] JOIN 顺序是否合理？`,
    },
  ];

  for (const s of defaultSkills) {
    if (byName.has(s.name)) {
      console.log(`  ✅ Skill 已存在：${s.icon} ${s.name}`);
      continue;
    }
    const id = createId();
    await db.insert(skills).values({ id, userId, ...s });
    byName.set(s.name, id);
    console.log(`  ＋ 已创建 Skill：${s.icon} ${s.name}`);
  }
  return byName;
}

/** 幂等创建默认 Tools，返回 name → id 映射。 */
async function ensureCustomTools(userId: string): Promise<Map<string, string>> {
  const existing = await db.select({ id: customTools.id, name: customTools.name }).from(customTools).where(eq(customTools.userId, userId));
  const byName = new Map(existing.map((t) => [t.name, t.id]));

  const defaultTools = [
    { name: "weather_query", displayName: "天气查询", description: "查询指定城市的实时天气信息", icon: "🌤️", tags: ["天气", "API"], type: "http" as const, httpConfig: { url: "https://wttr.in/{{city}}", method: "GET" as const, headers: { "User-Agent": "curl/7.68.0" }, queryTemplate: { format: "j1" } }, promptConfig: null, parameters: [{ name: "city", type: "string" as const, description: "城市名称（英文）", required: true }] },
    { name: "json_formatter", displayName: "JSON 格式化", description: "将文本数据格式化为规范 JSON", icon: "📋", tags: ["格式化"], type: "prompt" as const, httpConfig: null, promptConfig: { systemInstruction: "将用户提供的数据解析并转换为格式规范的 JSON。", outputFormat: "json" }, parameters: [{ name: "data", type: "string" as const, description: "需要格式化的数据", required: true }] },
    { name: "text_summarizer", displayName: "文本摘要", description: "将长文本压缩为简洁摘要", icon: "📝", tags: ["文本"], type: "prompt" as const, httpConfig: null, promptConfig: { systemInstruction: "生成文本摘要，保留核心信息，长度控制在原文 20-30%。", outputFormat: "markdown" }, parameters: [{ name: "text", type: "string" as const, description: "需要摘要的文本", required: true }, { name: "maxLength", type: "number" as const, description: "最大字数", required: false, default: 200 }] },
    { name: "regex_generator", displayName: "正则表达式生成器", description: "根据描述生成正则表达式", icon: "🔤", tags: ["正则", "开发"], type: "prompt" as const, httpConfig: null, promptConfig: { systemInstruction: "根据自然语言描述生成正则表达式，含解释和测试用例。", outputFormat: "markdown" }, parameters: [{ name: "description", type: "string" as const, description: "描述需要匹配的模式", required: true }] },
    { name: "ip_lookup", displayName: "IP 地址查询", description: "查询 IP 地址的地理位置信息", icon: "🌍", tags: ["网络", "API"], type: "http" as const, httpConfig: { url: "http://ip-api.com/json/{{ip}}", method: "GET" as const, queryTemplate: { fields: "status,message,country,regionName,city,isp,org,query", lang: "zh-CN" } }, promptConfig: null, parameters: [{ name: "ip", type: "string" as const, description: "要查询的 IP 地址", required: true }] },
    { name: "markdown_to_outline", displayName: "Markdown 大纲提取", description: "从 Markdown 提取标题结构生成大纲", icon: "📑", tags: ["Markdown"], type: "prompt" as const, httpConfig: null, promptConfig: { systemInstruction: "提取 Markdown 标题层级，生成缩进大纲目录。", outputFormat: "markdown" }, parameters: [{ name: "markdown", type: "string" as const, description: "Markdown 文档内容", required: true }] },
  ];

  for (const t of defaultTools) {
    if (byName.has(t.name)) {
      console.log(`  ✅ Tool 已存在：${t.icon} ${t.displayName}`);
      continue;
    }
    const id = createId();
    await db.insert(customTools).values({ id, userId, ...t });
    byName.set(t.name, id);
    console.log(`  ＋ 已创建 Tool：${t.icon} ${t.displayName}`);
  }
  return byName;
}

/** 关联 Agent 与 Skills/Tools */
async function linkSkillsAndTools(
  userId: string,
  agentIds: Record<string, string>,
  skillIdByName: Map<string, string>,
  toolIdByName: Map<string, string>,
) {
  const nameByKey = new Map<string, string>(professionalAgentTemplates.map((t) => [t.name, t.key]));

  // 也处理不在 professionalAgentTemplates 中的 Agent（如手动创建的）
  const allAgents = await db.select({ id: agents.id, name: agents.name }).from(agents).where(eq(agents.userId, userId));
  const agentIdByName = new Map(allAgents.map((a) => [a.name, a.id]));

  for (const [agentName, skillNames] of Object.entries(AGENT_SKILL_MAPPING)) {
    const agentId = agentIdByName.get(agentName);
    if (!agentId) continue;
    const ids = skillNames.map((n) => skillIdByName.get(n)).filter((id): id is string => Boolean(id));
    if (ids.length === 0) continue;
    await setAgentSkills(agentId, ids, userId);
    console.log(`  🔗 ${agentName} ← Skills: ${skillNames.join("、")}`);
  }

  for (const [agentName, toolNames] of Object.entries(AGENT_TOOL_MAPPING)) {
    const agentId = agentIdByName.get(agentName);
    if (!agentId) continue;
    const ids = toolNames.map((n) => toolIdByName.get(n)).filter((id): id is string => Boolean(id));
    if (ids.length === 0) continue;
    await setAgentCustomTools(agentId, ids, userId);
    console.log(`  🔗 ${agentName} ← Tools: ${toolNames.join("、")}`);
  }
}

async function main() {
  console.log("\n🚀 AgentNexus 一键初始化（非破坏式，可重复运行）\n");
  try {
    const user = await ensureUser();

    const config = await getProviderConfig(user.id);
    if (!config?.embeddingModel && !SKIP_INDEX) {
      console.warn(
        "⚠️  尚未配置 embedding 模型：知识库文档会登记为失败，配置后在 UI 点『重新索引』即可。\n",
      );
    }

    console.log("— Agents —");
    const agentIds = await ensureAgents(user.id);
    console.log("— 工作流 —");
    await ensureWorkflows(user.id, agentIds);
    console.log("— 知识库与文档 —");
    const kbIdByName = await ensureKnowledge(user.id);
    console.log("— Agent × 知识库 关联 —");
    await linkAgents(user.id, agentIds, kbIdByName);
    console.log("— Skills —");
    const skillIdByName = await ensureSkills(user.id);
    console.log("— Tools —");
    const toolIdByName = await ensureCustomTools(user.id);
    console.log("— Agent × Skill/Tool 关联 —");
    await linkSkillsAndTools(user.id, agentIds, skillIdByName, toolIdByName);

    console.log(
      [
        "\n🎉 初始化完成。",
        "后续：",
        "  1. 「设置」确认模型与 embedding 配置；",
        "  2. 知识库详情页检查文档索引状态，failed 的逐个『重新索引』（注意 embedding 限流）；",
        "  3. 打开对话即可使用各 Agent，工作流在「工作流」模块运行。",
        "  4. Agent 已关联默认 Skills 和 Tools，在 Agent 编辑页可查看和调整。",
      ].join("\n"),
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("\n❌ 初始化失败：", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
