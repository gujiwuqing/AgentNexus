import type { HttpRequestNodeConfig, ExecutionContext } from "@/types/workflow";
import { resolveTemplate } from "../template";
import { httpRequestTool } from "@/lib/tools/http-request";

export async function executeHttpRequestNode(
  config: HttpRequestNodeConfig,
  vars: { input: string; context: ExecutionContext },
): Promise<string> {
  const url = resolveTemplate(config.url, vars);
  const headers = Object.fromEntries(
    Object.entries(config.headers ?? {}).map(([k, v]) => [k, resolveTemplate(v, vars)]),
  );
  const body = config.bodyTemplate ? resolveTemplate(config.bodyTemplate, vars) : undefined;
  return httpRequestTool.execute({ url, method: config.method, headers, body });
}
