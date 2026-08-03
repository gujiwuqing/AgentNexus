import vm from "node:vm";

export type SandboxResult = { output: string; error?: string };

/**
 * 在 context 内部自建 console。绝不能把宿主的 console/Object/JSON 等注入进来——
 * 任何一个宿主对象或函数进入 sandbox，用户代码都能顺着它的原型链拿到宿主 realm 的
 * Function 构造器，进而 `Object.constructor("return process")()` 逃逸出去。
 * context 自带一整套自己 realm 的内置对象，无需注入。
 */
const BOOTSTRAP = `
  globalThis.__logs = [];
  const __fmt = (args) => args.map((a) => {
    if (typeof a === "string") return a;
    if (typeof a === "object" && a !== null) {
      try { return JSON.stringify(a); } catch (e) { return String(a); }
    }
    return String(a);
  }).join(" ");
  globalThis.console = {
    log: (...args) => { globalThis.__logs.push(__fmt(args)); },
    error: (...args) => { globalThis.__logs.push("[error] " + __fmt(args)); },
    warn: (...args) => { globalThis.__logs.push("[warn] " + __fmt(args)); },
  };
`;

const INNER_TIMEOUT_MS = 1000;

/**
 * sandbox 里 throw 出来的 Error 属于 context realm，`instanceof Error` 恒为 false，
 * 只能直接取 message，否则所有运行时报错都会被抹成一句通用文案。
 */
function errorMessage(err: unknown, fallback: string): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message !== "") return message;
  }
  return fallback;
}

function readLogs(context: vm.Context): string[] {
  try {
    const json = vm.runInContext("JSON.stringify(globalThis.__logs ?? [])", context, {
      timeout: INNER_TIMEOUT_MS,
    });
    return typeof json === "string" ? (JSON.parse(json) as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * 表达式返回值可能是 context realm 的对象，直接在宿主侧 String() 会触发它自己的
 * toString——虽然拿不到宿主，但绕过了 timeout。统一放回 context 内序列化。
 */
function stringifyInContext(context: vm.Context, value: unknown): string {
  const kind = typeof value;
  if (value === null) return "null";
  if (kind !== "object" && kind !== "function") return String(value);
  try {
    (context as Record<string, unknown>).__raw = value;
    const text = vm.runInContext(
      "(function () { try { return JSON.stringify(globalThis.__raw) ?? String(globalThis.__raw); } catch (e) { return '[unserializable]'; } })()",
      context,
      { timeout: INNER_TIMEOUT_MS },
    );
    return typeof text === "string" ? text : "[unserializable]";
  } catch {
    return "[unserializable]";
  }
}

export async function runSandboxedCode(
  code: string,
  extraGlobals: Record<string, unknown> = {},
  timeoutMs = 5000,
  maxOutputBytes = 5 * 1024,
): Promise<SandboxResult> {
  const context = vm.createContext(undefined, {
    codeGeneration: { strings: true, wasm: false },
  });

  try {
    vm.runInContext(BOOTSTRAP, context, { timeout: INNER_TIMEOUT_MS });
    // 入参走 JSON 传值而非引用，顺带把函数之类不可序列化的东西挡在外面
    const payload = JSON.stringify(JSON.stringify(extraGlobals ?? {}));
    vm.runInContext(`Object.assign(globalThis, JSON.parse(${payload}))`, context, {
      timeout: INNER_TIMEOUT_MS,
    });
  } catch (err) {
    return { output: "", error: errorMessage(err, "Sandbox init failed") };
  }

  try {
    const raw = vm.runInContext(code, context, { timeout: timeoutMs });
    const logs = readLogs(context);
    const tail = raw !== undefined && logs.length === 0 ? stringifyInContext(context, raw) : "";
    return { output: (logs.join("\n") + tail).slice(0, maxOutputBytes) };
  } catch (err) {
    return {
      output: readLogs(context).join("\n").slice(0, maxOutputBytes),
      error: errorMessage(err, "Execution failed"),
    };
  }
}
