import { generateText } from "ai";
import { createModelClient } from "@/lib/ai/provider-factory";
import { generateAgentReply } from "@/lib/ai/generate";
import { getAgent } from "@/server/agents";
import { assembleAgentRuntime } from "@/server/agent-runtime";
import { createEvalRun } from "@/server/evals";
import type { EvalCaseInput } from "@/server/evals";

type EvalCaseRow = {
  id: string;
  agentId: string;
  input: string;
  expectedOutput: string | null;
  criteria: string;
};

export async function runEvalCase(evalCase: EvalCaseRow, userId: string): Promise<{ score: number; feedback: string; output: string }> {
  const agent = await getAgent(evalCase.agentId);
  if (!agent) throw new Error("Agent not found");

  // 评测必须跑与线上完全一致的装配（知识库 + 内置/自定义工具 + 技能 + 团队），
  // 否则分数反映的是一个现实中不存在的阉割版 Agent
  const runtime = await assembleAgentRuntime({
    agent,
    prompt: evalCase.input,
    ownerUserId: userId,
  });
  const provider = runtime.provider;

  const startedAt = Date.now();
  const actualOutput = await generateAgentReply(
    provider,
    runtime.messages,
    runtime.options,
    runtime.tools,
    runtime.maxSteps,
  );
  const durationMs = Date.now() - startedAt;

  // 用 LLM 评判
  const judgePrompt = [
    "你是一个 AI 输出质量评判员。请对以下 AI 回复进行评分（0-1 分）。",
    "",
    `评判标准：${evalCase.criteria}`,
    "",
    `用户输入：${evalCase.input}`,
    "",
    evalCase.expectedOutput ? `期望输出参考：${evalCase.expectedOutput}\n` : "",
    `实际输出：${actualOutput}`,
    "",
    "请严格按以下 JSON 格式输出（不要输出其他内容）：",
    '{"score": 0.85, "feedback": "简要评判理由"}',
  ].filter(Boolean).join("\n");

  const judgeResult = await generateText({
    model: createModelClient(provider),
    messages: [{ role: "user", content: judgePrompt }],
    maxTokens: 500,
    temperature: 0.1,
  });

  let score = 0;
  let feedback = "";
  try {
    const parsed = JSON.parse(judgeResult.text);
    score = typeof parsed.score === "number" ? Math.max(0, Math.min(1, parsed.score)) : 0;
    feedback = parsed.feedback || "";
  } catch {
    feedback = judgeResult.text;
    score = 0.5;
  }

  await createEvalRun({
    caseId: evalCase.id,
    actualOutput,
    score,
    feedback,
    model: provider.model,
    durationMs,
  });

  return { score, feedback, output: actualOutput };
}
