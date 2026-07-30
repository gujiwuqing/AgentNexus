import { streamText, type CoreTool, type CoreMessage } from "ai";
import type { ProviderConfig } from "./provider";
import { createModelClient } from "./provider-factory";

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
};

export function streamAgentReply(
  provider: ProviderConfig,
  messages: ChatMessage[],
  options: ChatOptions,
  tools: Record<string, CoreTool> | undefined,
  onFinish: (meta: StreamFinishMeta) => Promise<void> | void
) {
  const toolCalls: ToolCallRecord[] = [];
  return streamText({
    model: createModelClient(provider),
    messages: messages as CoreMessage[],
    tools,
    maxSteps: 5,
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
    onFinish: async ({ text, usage }) => {
      await onFinish({ text, usage, toolCalls });
    },
  });
}
