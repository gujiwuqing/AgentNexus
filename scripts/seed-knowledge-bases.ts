/**
 * 批量创建知识库并上传 knowledge-seed/ 下的 Markdown 文档。
 *
 * 通过 HTTP API 执行（复用登录态），上传后服务端会自动分块 + embedding。
 * 因此运行前需满足：
 *   1. 开发服务器已启动（pnpm run dev），默认 http://localhost:3000
 *   2. 已在「设置」页配置 embedding 模型（否则文档会索引失败，可稍后重新索引）
 *
 * 用法：
 *   SEED_EMAIL=you@example.com SEED_PASSWORD=yourpass pnpm tsx scripts/seed-knowledge-bases.ts
 * 可选环境变量：
 *   SEED_BASE_URL           默认 http://localhost:3000
 *   SEED_EMBEDDING_MODEL    建库时指定 embedding 模型（不填则用全局设置）
 *   SEED_CHUNK_SIZE         默认 800
 *   SEED_CHUNK_OVERLAP      默认 100
 *
 * 幂等：同名知识库会复用，已存在的同名文档会跳过，可安全重复运行。
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = (process.env.SEED_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const EMAIL = process.env.SEED_EMAIL ?? "";
const PASSWORD = process.env.SEED_PASSWORD ?? "";
const EMBEDDING_MODEL = process.env.SEED_EMBEDDING_MODEL || undefined;
const CHUNK_SIZE = Number(process.env.SEED_CHUNK_SIZE ?? 800);
const CHUNK_OVERLAP = Number(process.env.SEED_CHUNK_OVERLAP ?? 100);

const SEED_DIR = path.resolve(fileURLToPath(new URL("..", import.meta.url)), "knowledge-seed");

/** 每个知识库的描述（按去掉数字前缀后的目录名匹配）。 */
const KB_DESCRIPTIONS: Record<string, string> = {
  工程规范库: "编码规范、代码评审清单、Git 与提交规范、API 设计准则——建议挂载给「代码评审员」「技术方案师」。",
  测试与质量库: "测试设计方法论、用例模板、缺陷分级、发布准入清单——建议挂载给「测试设计师」。",
  需求与产品库: "PRD 模板、用户故事与验收标准、需求优先级框架——建议挂载给「需求分析师」「产品运营策划」。",
  架构与技术选型库: "架构决策记录 ADR、技术选型对比方法、非功能性需求清单——建议挂载给「技术方案师」「深度研究员」。",
};

let sessionCookie = "";

async function api(method: string, endpoint: string, body?: unknown, isForm = false) {
  const headers: Record<string, string> = {};
  if (sessionCookie) headers.cookie = sessionCookie;
  if (!isForm && body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: isForm ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
  });
  return res;
}

async function login() {
  if (!EMAIL || !PASSWORD) {
    throw new Error("请设置 SEED_EMAIL 和 SEED_PASSWORD 环境变量（登录用的账号密码）。");
  }
  const res = await api("POST", "/api/auth/login", { email: EMAIL, password: PASSWORD });
  if (!res.ok) {
    throw new Error(`登录失败（${res.status}）：请检查账号密码与服务器地址 ${BASE_URL}`);
  }
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/session_token=([^;]+)/);
  if (!match) throw new Error("登录成功但未拿到 session cookie。");
  sessionCookie = `session_token=${match[1]}`;
  console.log(`✅ 已登录：${EMAIL}`);
}

type KbSummary = { id: string; name: string };

/** 找同名知识库，存在则复用，否则新建。 */
async function ensureKnowledgeBase(name: string, description: string): Promise<string> {
  const listRes = await api("GET", "/api/knowledge-bases");
  if (!listRes.ok) throw new Error(`获取知识库列表失败（${listRes.status}）`);
  const existing = (await listRes.json()) as KbSummary[];
  const found = existing.find((kb) => kb.name === name);
  if (found) {
    console.log(`  ↺ 复用已存在的知识库「${name}」`);
    return found.id;
  }
  const createRes = await api("POST", "/api/knowledge-bases", {
    name,
    description,
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
    ...(EMBEDDING_MODEL ? { embeddingModel: EMBEDDING_MODEL } : {}),
  });
  if (!createRes.ok) throw new Error(`创建知识库「${name}」失败（${createRes.status}）`);
  const kb = (await createRes.json()) as KbSummary;
  console.log(`  ＋ 新建知识库「${name}」`);
  return kb.id;
}

type DocSummary = { filename: string };

async function uploadDocsForKb(kbId: string, dir: string) {
  const files = (await readdir(dir)).filter((f) => f.toLowerCase().endsWith(".md"));

  const docsRes = await api("GET", `/api/knowledge-bases/${kbId}/documents`);
  const existingDocs = docsRes.ok ? ((await docsRes.json()) as DocSummary[]) : [];
  const existingNames = new Set(existingDocs.map((d) => d.filename));

  for (const filename of files) {
    if (existingNames.has(filename)) {
      console.log(`    ⤼ 跳过已存在文档：${filename}`);
      continue;
    }
    const buf = await readFile(path.join(dir, filename));
    const form = new FormData();
    form.append("file", new File([buf], filename, { type: "text/markdown" }));
    const res = await api("POST", `/api/knowledge-bases/${kbId}/documents`, form, true);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`    ✗ 上传失败：${filename}（${res.status}）${text}`);
      continue;
    }
    console.log(`    ↑ 已上传：${filename}（后台索引中）`);
  }
}

async function main() {
  console.log(`\n📚 知识库批量导入 → ${BASE_URL}\n`);
  await login();

  const entries = await readdir(SEED_DIR, { withFileTypes: true });
  const folders = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  if (folders.length === 0) {
    console.warn(`未在 ${SEED_DIR} 找到任何知识库子目录。`);
    return;
  }

  for (const folder of folders) {
    // 目录名形如 "01-工程规范库"，去掉数字前缀作为知识库名。
    const name = folder.replace(/^\d+[-_]?/, "");
    const description = KB_DESCRIPTIONS[name] ?? "";
    console.log(`\n📁 ${folder} → 知识库「${name}」`);
    const kbId = await ensureKnowledgeBase(name, description);
    await uploadDocsForKb(kbId, path.join(SEED_DIR, folder));
  }

  console.log(
    [
      "\n🎉 导入完成。",
      "提示：",
      "  • 文档在后台异步索引，可在知识库详情页查看状态（completed / failed）。",
      "  • 若状态为 failed，多为未配置 embedding 模型——在「设置」配置后点“重新索引”。",
      "  • 随后到各 Agent 详情页勾选关联对应知识库，即可让 Agent 检索这些资料。",
    ].join("\n"),
  );
}

main().catch((err) => {
  console.error("\n❌ 出错：", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
