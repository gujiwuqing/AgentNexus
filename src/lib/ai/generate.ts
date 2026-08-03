import { generateText, type CoreTool, type CoreMessage } from "ai";
import type { ProviderConfig } from "./provider";
import { createModelClient } from "./provider-factory";
import { DEFAULT_MAX_STEPS, withStepLimitNotice, type ChatMessage, type ChatOptions } from "./chat";

export async function generateAgentReply(
  provider: ProviderConfig,
  messages: ChatMessage[],
  options: ChatOptions,
  tools?: Record<string, CoreTool>,
  maxSteps: number = DEFAULT_MAX_STEPS,
): Promise<string> {
  const result = await generateText({
    model: createModelClient(provider),
    messages: messages as CoreMessage[],
    tools,
    maxSteps,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    topP: options.topP,
  });
  return withStepLimitNotice(result.text, result.finishReason, maxSteps);
}
