import { streamText, type CoreTool, type CoreMessage } from "ai";
import type { ProviderConfig } from "./provider";
import { createModelClient } from "./provider-factory";

/**
 * 工具调用轮数上限。load_skill / read_skill_resource 这两个元工具也各吃一步，
 * 旧值 5 在“加载技能 + 读参考资料 + 几次真实工具调用”的场景下会直接被截断。
 */
export const DEFAULT_MAX_STEPS = 12;
export const MAX_ALLOWED_STEPS = 40;

/** finishReason 为 tool-calls 意味着模型还想继续调工具但步数用尽，回答很可能不完整。 */
export function stepLimitNotice(maxSteps: number): string {
  return `\n\n> ⚠️ 已达到本次回复的工具调用步数上限（${maxSteps} 步），回答可能不完整。可在 Agent 设置中提高“最大工具调用步数”，或将任务拆小后重试。`;
}

export function withStepLimitNotice(text: string, finishReason: string, maxSteps: number): string {
  return finishReason === "tool-calls" ? text + stepLimitNotice(maxSteps) : text;
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image?: string }>;
};

export type ChatOptions = {
  temperature: number;
  maxTokens: number;
  topP: number;
};

export type ToolCallRecord = {
  toolName: string;
  args: Record<string, unknown>;
  result: string;
};

export type StreamFinishMeta = {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  toolCalls: ToolCallRecord[];
  /** 步数耗尽标记，供调用方在落库文本里追加提示 */
  stepLimitReached: boolean;
};

export function streamAgentReply(
  provider: ProviderConfig,
  messages: ChatMessage[],
  options: ChatOptions,
  tools: Record<string, CoreTool> | undefined,
  onFinish: (meta: StreamFinishMeta) => Promise<void> | void,
  maxSteps: number = DEFAULT_MAX_STEPS,
) {
  const toolCalls: ToolCallRecord[] = [];
  return streamText({
    model: createModelClient(provider),
    messages: messages as CoreMessage[],
    tools,
    maxSteps,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    topP: options.topP,
    onStepFinish: (step) => {
      const calls = (step.toolCalls ?? []) as Array<{ toolCallId: string; toolName: string; args: unknown }>;
      const results = (step.toolResults ?? []) as Array<{ toolCallId: string; result: unknown }>;
      for (const call of calls) {
        const matched = results.find((r) => r.toolCallId === call.toolCallId);
        toolCalls.push({
          toolName: call.toolName,
          args: call.args as Record<string, unknown>,
          result: matched ? String(matched.result) : "",
        });
      }
    },
    onFinish: async ({ text, usage, finishReason }) => {
      await onFinish({ text, usage, toolCalls, stepLimitReached: finishReason === "tool-calls" });
    },
  });
}
