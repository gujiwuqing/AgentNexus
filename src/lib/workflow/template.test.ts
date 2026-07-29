import { describe, it, expect } from "vitest";
import { resolveTemplate } from "./template";

describe("resolveTemplate", () => {
  it("replaces {{input}} with the run input", () => {
    expect(resolveTemplate("Hello {{input}}", { input: "world", context: {} })).toBe("Hello world");
  });

  it("replaces {{nodeId.output}} with context values", () => {
    expect(
      resolveTemplate("Result: {{step1.output}}", { input: "", context: { step1: "42" } })
    ).toBe("Result: 42");
  });

  it("handles multiple variables", () => {
    expect(
      resolveTemplate("{{input}} and {{a.output}}", { input: "X", context: { a: "Y" } })
    ).toBe("X and Y");
  });

  it("leaves unresolved variables as-is", () => {
    expect(resolveTemplate("{{unknown.output}}", { input: "", context: {} })).toBe("{{unknown.output}}");
  });

  it("returns the string unchanged when there are no variables", () => {
    expect(resolveTemplate("plain text", { input: "", context: {} })).toBe("plain text");
  });
});
