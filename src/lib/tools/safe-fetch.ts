import { lookup } from "node:dns/promises";
import net from "node:net";

export const DEFAULT_TIMEOUT_MS = 10_000;
export const DEFAULT_MAX_RESPONSE_BYTES = 10 * 1024;
const MAX_REDIRECTS = 3;

export class BlockedRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlockedRequestError";
  }
}

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.goog",
]);

/** 私网/回环/链路本地（含 169.254.169.254 云元数据）/CGNAT/组播，一律拒绝。 */
export function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return true;
  const [a, b] = parts.map((p) => Number(p));
  if (!Number.isInteger(a) || !Number.isInteger(b)) return true;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && (b === 168 || b === 0)) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

export function isBlockedIpv6(ip: string): boolean {
  const v = ip.toLowerCase().replace(/^\[/, "").replace(/\]$/, "").split("%")[0];
  if (v === "::" || v === "::1") return true;
  if (v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb")) return true;
  if (/^f[cd]/.test(v)) return true;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v);
  if (mapped) return isBlockedIpv4(mapped[1]);
  return false;
}

function assertAddressAllowed(address: string, family: number, host: string): void {
  const blocked = family === 6 ? isBlockedIpv6(address) : isBlockedIpv4(address);
  if (blocked) {
    throw new BlockedRequestError(`Access to internal address is not allowed (${host} -> ${address})`);
  }
}

/**
 * 校验一个 URL 是否可以对外请求。主机名会经 DNS 解析后逐个校验解析结果，
 * 否则 `http://internal.example.com` 这种指向内网的域名可以直接绕过字面量黑名单。
 */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BlockedRequestError(`Invalid URL: ${raw}`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new BlockedRequestError(`Protocol ${url.protocol} is not allowed`);
  }

  const host = url.hostname.replace(/^\[/, "").replace(/\]$/, "").toLowerCase();
  if (!host) throw new BlockedRequestError("Missing host");
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".localhost") || host.endsWith(".internal")) {
    throw new BlockedRequestError(`Access to internal host is not allowed (${host})`);
  }

  const literal = net.isIP(host);
  if (literal !== 0) {
    assertAddressAllowed(host, literal, host);
    return url;
  }

  let records: Array<{ address: string; family: number }>;
  try {
    records = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new BlockedRequestError(`DNS resolution failed for ${host}`);
  }
  if (records.length === 0) throw new BlockedRequestError(`DNS resolution failed for ${host}`);
  for (const record of records) assertAddressAllowed(record.address, record.family, host);

  return url;
}

/** header 值里的 CR/LF 会造成响应头拆分，模型可控的 header 必须先清洗。 */
export function sanitizeHeaders(headers?: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (!/^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/.test(key)) continue;
    const clean = String(value).replace(/[\r\n]/g, "").trim();
    if (clean) result[key] = clean;
  }
  return result;
}

/** 边读边计数，超限立刻 cancel，避免下游返回超大响应把进程打爆。 */
async function readCapped(res: Response, maxBytes: number): Promise<{ text: string; truncated: boolean }> {
  if (!res.body) return { text: "", truncated: false };
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    if (total + value.byteLength > maxBytes) {
      chunks.push(value.subarray(0, maxBytes - total));
      truncated = true;
      await reader.cancel().catch(() => {});
      break;
    }
    chunks.push(value);
    total += value.byteLength;
  }

  return { text: Buffer.concat(chunks).toString("utf8"), truncated };
}

export type SafeFetchOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  maxResponseBytes?: number;
};

export type SafeFetchResult = {
  status: number;
  body: string;
  truncated: boolean;
};

export async function safeFetch(raw: string, options: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let current = await assertPublicUrl(raw);

    for (let hop = 0; ; hop++) {
      const res = await fetch(current, {
        method: options.method ?? "GET",
        headers: sanitizeHeaders(options.headers),
        body: options.body,
        signal: controller.signal,
        // 手动跟随跳转：公网 URL 302 到 127.0.0.1 是绕过 SSRF 校验的标准手法
        redirect: "manual",
      });

      const location = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
      if (!location) {
        const { text, truncated } = await readCapped(res, maxBytes);
        return { status: res.status, body: text, truncated };
      }
      if (hop >= MAX_REDIRECTS) throw new BlockedRequestError("Too many redirects");
      current = await assertPublicUrl(new URL(location, current).toString());
    }
  } finally {
    clearTimeout(timer);
  }
}
