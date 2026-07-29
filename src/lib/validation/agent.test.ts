import { describe, it, expect } from "vitest";
import { agentInputSchema } from "./agent";

describe("agentInputSchema", () => {
  it("accepts a minimal valid agent", () => {
    const result = agentInputSchema.safeParse({ name: "Helper" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = agentInputSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects temperature outside 0-2", () => {
    const result = agentInputSchema.safeParse({ name: "Helper", temperature: 5 });
    expect(result.success).toBe(false);
  });

  it("defaults optional fields", () => {
    const result = agentInputSchema.parse({ name: "Helper" });
    expect(result.description).toBe("");
    expect(result.temperature).toBe(0.7);
    expect(result.tags).toEqual([]);
  });

  it("defaults model to null when omitted", () => {
    const result = agentInputSchema.parse({ name: "A" });
    expect(result.model).toBeNull();
  });

  it("accepts a model string", () => {
    const result = agentInputSchema.parse({ name: "A", model: "gpt-test" });
    expect(result.model).toBe("gpt-test");
  });
});
