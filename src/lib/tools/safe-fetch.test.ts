import { describe, it, expect, vi, beforeEach } from "vitest";

const lookupMock = vi.hoisted(() => vi.fn());
vi.mock("node:dns/promises", () => ({ lookup: lookupMock }));

import { assertPublicUrl, sanitizeHeaders, isBlockedIpv4, isBlockedIpv6, BlockedRequestError } from "./safe-fetch";

beforeEach(() => {
  lookupMock.mockReset();
  lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
});

describe("isBlockedIpv4", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "192.168.0.1",
    "172.16.0.1",
    "172.31.255.255",
    "169.254.169.254", // 云元数据服务
    "0.0.0.0",
    "100.64.0.1", // CGNAT
    "224.0.0.1",
  ])("blocks %s", (ip) => expect(isBlockedIpv4(ip)).toBe(true));

  it.each(["8.8.8.8", "93.184.216.34", "172.32.0.1", "11.0.0.1"])("allows %s", (ip) =>
    expect(isBlockedIpv4(ip)).toBe(false),
  );
});

describe("isBlockedIpv6", () => {
  it.each(["::1", "::", "fe80::1", "fc00::1", "fd12::34", "::ffff:127.0.0.1"])("blocks %s", (ip) =>
    expect(isBlockedIpv6(ip)).toBe(true),
  );
  it.each(["2001:4860:4860::8888", "::ffff:8.8.8.8"])("allows %s", (ip) =>
    expect(isBlockedIpv6(ip)).toBe(false),
  );
});

describe("assertPublicUrl", () => {
  it("rejects non-http protocols", async () => {
    await expect(assertPublicUrl("file:///etc/passwd")).rejects.toThrow(BlockedRequestError);
    await expect(assertPublicUrl("gopher://x/")).rejects.toThrow(/not allowed/);
  });

  it("rejects internal literal addresses without touching DNS", async () => {
    await expect(assertPublicUrl("http://127.0.0.1:3000/x")).rejects.toThrow(/internal address/);
    await expect(assertPublicUrl("http://169.254.169.254/latest/meta-data/")).rejects.toThrow(/internal address/);
    await expect(assertPublicUrl("http://[::1]:8080/")).rejects.toThrow(/internal address/);
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it("rejects internal hostnames", async () => {
    await expect(assertPublicUrl("http://localhost:3000")).rejects.toThrow(/internal host/);
    await expect(assertPublicUrl("http://db.internal/health")).rejects.toThrow(/internal host/);
    await expect(assertPublicUrl("http://metadata.google.internal/")).rejects.toThrow(/internal host/);
  });

  // 这是旧实现最大的漏洞：字面量黑名单挡不住解析到内网的域名
  it("rejects hostnames that resolve to a private address", async () => {
    lookupMock.mockResolvedValue([{ address: "10.0.0.5", family: 4 }]);
    await expect(assertPublicUrl("http://intranet.example.com/admin")).rejects.toThrow(/10\.0\.0\.5/);
  });

  it("rejects when any resolved address is private", async () => {
    lookupMock.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ]);
    await expect(assertPublicUrl("http://mixed.example.com")).rejects.toThrow(/internal address/);
  });

  it("rejects when DNS resolution fails or returns nothing", async () => {
    lookupMock.mockRejectedValue(new Error("ENOTFOUND"));
    await expect(assertPublicUrl("http://nope.example.com")).rejects.toThrow(/DNS resolution failed/);
    lookupMock.mockResolvedValue([]);
    await expect(assertPublicUrl("http://empty.example.com")).rejects.toThrow(/DNS resolution failed/);
  });

  it("accepts a public host", async () => {
    const url = await assertPublicUrl("https://api.example.com/v1/items?a=1");
    expect(url.host).toBe("api.example.com");
  });
});

describe("sanitizeHeaders", () => {
  it("strips CR/LF from values to prevent header injection", () => {
    expect(sanitizeHeaders({ "X-Token": "abc\r\nX-Admin: true" })).toEqual({
      "X-Token": "abcX-Admin: true",
    });
  });

  it("drops invalid header names and empty values", () => {
    expect(sanitizeHeaders({ "Bad Name": "v", Good: "v", Empty: "  " })).toEqual({ Good: "v" });
  });

  it("returns an empty object for undefined input", () => {
    expect(sanitizeHeaders(undefined)).toEqual({});
  });
});
