import { generateText, type CoreTool, type CoreMessage } from "ai";
import type { ProviderConfig } from "./provider";
import { createModelClient } from "./provider-factory";
import type { ChatMessage, ChatOptions } from "./chat";

export async function generateAgentReply(
  provider: ProviderConfig,
  messages: ChatMessage[],
  options: ChatOptions,
  tools?: Record<string, CoreTool>,
): Promise<string> {
  const result = await generateText({
    model: createModelClient(provider),
    messages: messages as CoreMessage[],
    tools,
    maxSteps: 5,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    topP: options.topP,
  });
  return result.text;
}
