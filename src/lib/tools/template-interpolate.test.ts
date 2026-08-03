import { describe, it, expect } from "vitest";
import { interpolate, interpolateRecord, interpolateJson, interpolateBody } from "./template-interpolate";

describe("interpolate", () => {
  it("substitutes placeholders and blanks unknown keys", () => {
    expect(interpolate("/v1/{{id}}/x?q={{q}}", { id: 7, q: "a" })).toBe("/v1/7/x?q=a");
    expect(interpolate("{{missing}}!", {})).toBe("!");
  });

  it("maps over record values", () => {
    expect(interpolateRecord({ Authorization: "Bearer {{token}}" }, { token: "t1" })).toEqual({
      Authorization: "Bearer t1",
    });
  });
});

describe("interpolateJson", () => {
  // 旧实现用朴素替换，参数里带引号会直接撑破 JSON 结构
  it("escapes quotes inside a JSON string literal", () => {
    const out = interpolateJson('{"q":"{{query}}"}', { query: 'he said "hi"' });
    expect(JSON.parse(out)).toEqual({ q: 'he said "hi"' });
  });

  it("escapes newlines, tabs and backslashes", () => {
    const out = interpolateJson('{"q":"{{query}}"}', { query: "a\nb\tc\\d" });
    expect(JSON.parse(out)).toEqual({ q: "a\nb\tc\\d" });
  });

  it("escapes a value embedded mid-string", () => {
    const out = interpolateJson('{"msg":"hello {{name}}, welcome"}', { name: 'Bo"b' });
    expect(JSON.parse(out)).toEqual({ msg: 'hello Bo"b, welcome' });
  });

  it("keeps native types for unquoted placeholders", () => {
    const out = interpolateJson('{"n":{{count}},"ok":{{flag}}}', { count: 5, flag: true });
    expect(JSON.parse(out)).toEqual({ n: 5, ok: true });
  });

  it("quotes strings used in an unquoted slot so the JSON stays valid", () => {
    const out = interpolateJson('{"v":{{val}}}', { val: 'a"b' });
    expect(JSON.parse(out)).toEqual({ v: 'a"b' });
  });

  it("renders undefined as null in a value slot and empty inside a string", () => {
    expect(JSON.parse(interpolateJson('{"v":{{nope}}}', {}))).toEqual({ v: null });
    expect(JSON.parse(interpolateJson('{"v":"{{nope}}"}', {}))).toEqual({ v: "" });
  });

  it("does not treat an escaped quote as the end of a string", () => {
    const out = interpolateJson('{"a":"x\\"y {{v}}"}', { v: 'q"' });
    expect(JSON.parse(out)).toEqual({ a: 'x"y q"' });
  });

  it("handles nested objects and arrays", () => {
    const out = interpolateJson('{"a":[{"b":"{{v}}"},{{n}}]}', { v: '"', n: 2 });
    expect(JSON.parse(out)).toEqual({ a: [{ b: '"' }, 2] });
  });
});

describe("interpolateBody", () => {
  it("uses JSON-safe interpolation for JSON bodies", () => {
    expect(JSON.parse(interpolateBody('  {"q":"{{v}}"}', { v: '"' }))).toEqual({ q: '"' });
    expect(JSON.parse(interpolateBody('[{"q":"{{v}}"}]', { v: "\n" }))).toEqual([{ q: "\n" }]);
  });

  it("falls back to plain substitution for non-JSON bodies", () => {
    expect(interpolateBody("a={{x}}&b=1", { x: "hi" })).toBe("a=hi&b=1");
    expect(interpolateBody("plain {{x}}", { x: '"q"' })).toBe('plain "q"');
  });
});
