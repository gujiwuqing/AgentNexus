import { describe, it, expect, vi } from "vitest";

const { generateTextMock, createOpenAIMock } = vi.hoisted(() => {
  const generateTextMock = vi.fn();
  const createOpenAIMock = vi.fn(() => (model: string) => ({ modelId: model }));
  return { generateTextMock, createOpenAIMock };
});

vi.mock("ai", () => ({ generateText: generateTextMock }));
vi.mock("@ai-sdk/openai", () => ({ createOpenAI: createOpenAIMock }));

import { generateAgentReply } from "./generate";

describe("generateAgentReply", () => {
  it("calls generateText with the right params and returns the text", async () => {
    generateTextMock.mockResolvedValue({ text: "Hello from AI" });

    const result = await generateAgentReply(
      { baseUrl: "https://api.example/v1", model: "test-model", apiKey: "key" },
      [{ role: "user", content: "hi" }],
      { temperature: 0.5, maxTokens: 100, topP: 0.9 }
    );

    expect(result).toBe("Hello from AI");
    expect(createOpenAIMock).toHaveBeenCalledWith({ baseURL: "https://api.example/v1", apiKey: "key" });
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: "user", content: "hi" }],
        temperature: 0.5,
        maxTokens: 100,
        topP: 0.9,
      })
    );
  });
});
