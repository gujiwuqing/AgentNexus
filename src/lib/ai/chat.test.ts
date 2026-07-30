import { describe, it, expect, vi } from "vitest";

const { streamTextMock, createOpenAIMock } = vi.hoisted(() => {
  const streamTextMock = vi.fn(() => ({ toTextStreamResponse: () => new Response("mocked"), toDataStreamResponse: () => new Response("mocked") }));
  const createOpenAIMock = vi.fn(() => (model: string) => ({ modelId: model }));
  return { streamTextMock, createOpenAIMock };
});

vi.mock("ai", () => ({ streamText: streamTextMock }));
vi.mock("@ai-sdk/openai", () => ({ createOpenAI: createOpenAIMock }));

import { streamAgentReply } from "./chat";

describe("streamAgentReply", () => {
  it("builds an OpenAI-compatible client from the provider config and calls streamText", () => {
    const provider = { providerType: "openai" as const, baseUrl: "https://api.example/v1", model: "gpt-test", apiKey: "key-123" };
    const messages = [{ role: "user" as const, content: "hi" }];
    const onFinish = vi.fn();

    streamAgentReply(provider, messages, { temperature: 0.5, maxTokens: 500, topP: 0.9 }, undefined, onFinish);

    expect(createOpenAIMock).toHaveBeenCalledWith({ baseURL: provider.baseUrl, apiKey: provider.apiKey });
    expect(streamTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages,
        temperature: 0.5,
        maxTokens: 500,
        topP: 0.9,
      })
    );
  });

  it("wires onFinish to forward text and usage", async () => {
    const provider = { providerType: "openai" as const, baseUrl: "https://api.example/v1", model: "gpt-test", apiKey: "key-123" };
    const onFinish = vi.fn();

    streamAgentReply(provider, [], { temperature: 0.7, maxTokens: 1024, topP: 1 }, undefined, onFinish);

    const callArgs = streamTextMock.mock.calls.at(-1)?.[0];
    await callArgs.onFinish({ text: "final answer", usage: { promptTokens: 7, completionTokens: 3, totalTokens: 10 } });
    expect(onFinish).toHaveBeenCalledWith({
      text: "final answer",
      usage: { promptTokens: 7, completionTokens: 3, totalTokens: 10 },
      toolCalls: [],
    });
  });
});
