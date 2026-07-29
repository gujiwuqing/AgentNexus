import { describe, it, expect } from "vitest";
import { executeCondition, executeTransform } from "./executors";

describe("executeCondition", () => {
  it("returns true when expression 'contains:X' matches", () => {
    expect(executeCondition("Hello World", "contains:World")).toBe(true);
  });

  it("returns false when expression 'contains:X' does not match", () => {
    expect(executeCondition("Hello", "contains:World")).toBe(false);
  });

  it("handles not_contains", () => {
    expect(executeCondition("Hello", "not_contains:World")).toBe(true);
    expect(executeCondition("Hello World", "not_contains:World")).toBe(false);
  });

  it("handles equals", () => {
    expect(executeCondition("yes", "equals:yes")).toBe(true);
    expect(executeCondition("no", "equals:yes")).toBe(false);
  });
});

describe("executeTransform", () => {
  it("handles substring", () => {
    expect(executeTransform("Hello World", "substring", { start: "0", end: "5" })).toBe("Hello");
  });

  it("handles replace", () => {
    expect(executeTransform("Hello World", "replace", { search: "World", replacement: "There" })).toBe("Hello There");
  });

  it("handles jsonExtract with a dot path", () => {
    expect(executeTransform('{"a":{"b":"value"}}', "jsonExtract", { path: "a.b" })).toBe("value");
  });

  it("handles jsonExtract returning non-string as JSON", () => {
    expect(executeTransform('{"a":42}', "jsonExtract", { path: "a" })).toBe("42");
  });

  it("handles template (passthrough)", () => {
    expect(executeTransform("ignored", "template", { template: "fixed output" })).toBe("fixed output");
  });
});
