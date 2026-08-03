import { describe, it, expect } from "vitest";
import { runSandboxedCode } from "./run-js";

describe("runSandboxedCode", () => {
  it("captures console output", async () => {
    const r = await runSandboxedCode(`console.log("a"); console.warn("b"); console.error("c");`);
    expect(r.error).toBeUndefined();
    expect(r.output).toBe("a\n[warn] b\n[error] c");
  });

  it("returns the last expression value when nothing was logged", async () => {
    expect((await runSandboxedCode("1 + 2")).output).toBe("3");
    expect((await runSandboxedCode(`({ a: 1 })`)).output).toBe('{"a":1}');
  });

  it("exposes extra globals by value", async () => {
    const r = await runSandboxedCode("console.log(input, JSON.stringify(context))", {
      input: "hello",
      context: { n1: "out" },
    });
    expect(r.output).toBe('hello {"n1":"out"}');
  });

  it("has working intrinsics without any host object injected", async () => {
    const r = await runSandboxedCode(
      `console.log(typeof JSON, typeof Math, typeof Date, typeof Object, Array.isArray([]), Math.max(1, 2))`,
    );
    expect(r.output).toBe("object object function function true 2");
  });

  it("reports errors and keeps logs written before the throw", async () => {
    const r = await runSandboxedCode(`console.log("before"); throw new Error("boom");`);
    expect(r.error).toBe("boom");
    expect(r.output).toBe("before");
  });

  it("enforces the timeout on infinite loops", async () => {
    const r = await runSandboxedCode("while (true) {}", {}, 100);
    expect(r.error).toBeTruthy();
  });

  it("truncates output to maxOutputBytes", async () => {
    const r = await runSandboxedCode(`console.log("x".repeat(100))`, {}, 5000, 10);
    expect(r.output).toHaveLength(10);
  });

  // 以下是逃逸回归：任何一条通过都意味着沙箱形同虚设
  it.each([
    ["Object.constructor", `Object.constructor("return process")()`],
    ["Array constructor chain", `[].constructor.constructor("return process")()`],
    ["JSON proto chain", `JSON.constructor.constructor("return process")()`],
    ["console.log constructor", `console.log.constructor("return process")()`],
    ["literal proto chain", `("").constructor.constructor("return process")()`],
  ])("blocks host realm escape via %s", async (_name, code) => {
    const r = await runSandboxedCode(`typeof (${code})`);
    // 要么在 context realm 里求值得到 undefined（拿不到宿主 process），要么直接抛错
    expect(r.error ? "threw" : r.output).not.toBe("object");
  });

  it("cannot reach require or process", async () => {
    const r = await runSandboxedCode(`[typeof require, typeof process, typeof Buffer].join(",")`);
    expect(r.output).toBe("undefined,undefined,undefined");
  });

  it("cannot read host env or spawn a child process", async () => {
    const r = await runSandboxedCode(
      `Object.constructor("return process.env.HOME")()`,
    );
    expect(r.output).not.toContain("/Users");
  });
});
