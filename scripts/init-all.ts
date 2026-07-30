/**
 * 一键初始化：账号 → 专业 Agent → 工作流 → 知识库（含文档索引）→ Agent×知识库关联。
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
import { users, agents, workflows, knowledgeDocuments } from "@/db/schema";
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

    console.log(
      [
        "\n🎉 初始化完成。",
        "后续：",
        "  1. 「设置」确认模型与 embedding 配置；",
        "  2. 知识库详情页检查文档索引状态，failed 的逐个『重新索引』（注意 embedding 限流）；",
        "  3. 打开对话即可使用各 Agent，工作流在「工作流」模块运行。",
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
