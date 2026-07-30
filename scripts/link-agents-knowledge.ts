/**
 * 按名称对应关系，把内置 Agent 关联到相应知识库。
 *
 * 通过 HTTP API 执行（复用登录态）。PUT 会整体替换该 Agent 的知识库关联，
 * 因此本脚本对每个 Agent 设置的就是下方 MAPPING 里列出的完整集合。
 *
 * 运行前：开发服务器已启动（pnpm run dev）。
 *
 * 用法：
 *   SEED_EMAIL=you@example.com SEED_PASSWORD=yourpass pnpm run link:knowledge
 * 可选：
 *   SEED_BASE_URL   默认 http://localhost:3000
 *
 * 幂等：可重复运行；未找到的 Agent / 知识库会跳过并告警，不影响其它项。
 * 说明：关联不依赖文档是否已索引成功——即便部分文档因限流未索引，关联也会正常建立，
 *       待文档索引完成后 RAG 自动生效。
 */

const BASE_URL = (process.env.SEED_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const EMAIL = process.env.SEED_EMAIL ?? "";
const PASSWORD = process.env.SEED_PASSWORD ?? "";

// Agent 名称 → 关联知识库名称（与 knowledge-seed 目录去前缀后的库名一致）。
const MAPPING: Record<string, string[]> = {
  深度研究员: ["架构与技术选型库"],
  需求分析师: ["需求与产品库"],
  产品运营策划: ["需求与产品库"],
  技术方案师: ["架构与技术选型库", "工程规范库"],
  代码评审员: ["工程规范库"],
  测试设计师: ["测试与质量库"],
  // 事实与逻辑审校员：通用审校，默认不挂知识库。
};

let sessionCookie = "";

async function api(method: string, endpoint: string, body?: unknown) {
  const headers: Record<string, string> = {};
  if (sessionCookie) headers.cookie = sessionCookie;
  if (body !== undefined) headers["content-type"] = "application/json";
  return fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function login() {
  if (!EMAIL || !PASSWORD) {
    throw new Error("请设置 SEED_EMAIL 和 SEED_PASSWORD 环境变量（登录用的账号密码）。");
  }
  const res = await api("POST", "/api/auth/login", { email: EMAIL, password: PASSWORD });
  if (!res.ok) throw new Error(`登录失败（${res.status}）：请检查账号密码与服务器地址 ${BASE_URL}`);
  const match = (res.headers.get("set-cookie") ?? "").match(/session_token=([^;]+)/);
  if (!match) throw new Error("登录成功但未拿到 session cookie。");
  sessionCookie = `session_token=${match[1]}`;
  console.log(`✅ 已登录：${EMAIL}`);
}

type NamedRow = { id: string; name: string };

async function main() {
  console.log(`\n🔗 Agent × 知识库 关联 → ${BASE_URL}\n`);
  await login();

  const agentsRes = await api("GET", "/api/agents");
  if (!agentsRes.ok) throw new Error(`获取 Agent 列表失败（${agentsRes.status}）`);
  const agents = (await agentsRes.json()) as NamedRow[];

  const kbsRes = await api("GET", "/api/knowledge-bases");
  if (!kbsRes.ok) throw new Error(`获取知识库列表失败（${kbsRes.status}）`);
  const kbs = (await kbsRes.json()) as NamedRow[];

  const agentByName = new Map(agents.map((a) => [a.name, a]));
  const kbIdByName = new Map(kbs.map((k) => [k.name, k.id]));

  for (const [agentName, kbNames] of Object.entries(MAPPING)) {
    const agent = agentByName.get(agentName);
    if (!agent) {
      console.warn(`  ⚠️  未找到 Agent「${agentName}」，跳过`);
      continue;
    }
    const resolved = kbNames
      .map((n) => ({ name: n, id: kbIdByName.get(n) }))
      .filter((x): x is { name: string; id: string } => {
        if (!x.id) console.warn(`  ⚠️  未找到知识库「${x.name}」，跳过（Agent：${agentName}）`);
        return Boolean(x.id);
      });

    if (resolved.length === 0) {
      console.warn(`  ⚠️  Agent「${agentName}」无可关联的知识库，跳过`);
      continue;
    }

    const putRes = await api("PUT", `/api/agents/${agent.id}/knowledge-bases`, {
      knowledgeBaseIds: resolved.map((r) => r.id),
    });
    if (!putRes.ok) {
      console.error(`  ✗ 关联失败：${agentName}（${putRes.status}）`);
      continue;
    }
    console.log(`  ✔ ${agentName} → ${resolved.map((r) => r.name).join("、")}`);
  }

  console.log(
    "\n🎉 关联完成。可到各 Agent 详情页确认「知识库」区域已勾选；" +
      "文档索引完成后，对话时会自动检索这些资料。",
  );
}

main().catch((err) => {
  console.error("\n❌ 出错：", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
