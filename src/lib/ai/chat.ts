import { streamText, type CoreTool } from "ai";
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

export type StreamFinishMeta = {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

export function streamAgentReply(
  provider: ProviderConfig,
  messages: ChatMessage[],
  options: ChatOptions,
  tools: Record<string, CoreTool> | undefined,
  onFinish: (meta: StreamFinishMeta) => Promise<void> | void
) {
  return streamText({
    model: createModelClient(provider),
    messages,
    tools,
    maxSteps: 5,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    topP: options.topP,
    onFinish: async ({ text, usage }) => {
      await onFinish({ text, usage });
    },
  });
}
