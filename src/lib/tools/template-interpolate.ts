/**
 * 工具参数插值。分两种模式：
 * - `interpolate`：朴素替换，用于 URL 片段、header 值、query 值（这些出口自带转义）。
 * - `interpolateBody`：JSON 请求体专用。朴素替换会让带引号/换行的参数值撑破 JSON
 *   结构（既是正确性 bug 也是注入面），这里按 JSON 词法判断占位符所处位置再转义。
 */

const PLACEHOLDER = /^\{\{(\w+)\}\}/;

export function interpolate(template: string, params: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = params[key];
    return value !== undefined ? String(value) : "";
  });
}

export function interpolateRecord(
  template: Record<string, string>,
  params: Record<string, unknown>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(template)) {
    result[key] = interpolate(value, params);
  }
  return result;
}

/** 转义成可以嵌进 JSON 字符串字面量内部的形式（不带外层引号）。 */
function escapeIntoJsonString(value: unknown): string {
  const text = value === undefined || value === null ? "" : typeof value === "string" ? value : String(value);
  return JSON.stringify(text).slice(1, -1);
}

/** 独立的 JSON 值：字符串会带上引号，数字/布尔保持原生类型。 */
function asJsonValue(value: unknown): string {
  if (value === undefined) return "null";
  return JSON.stringify(value) ?? "null";
}

export function interpolateJson(template: string, params: Record<string, unknown>): string {
  let out = "";
  let inString = false;
  let i = 0;

  while (i < template.length) {
    const ch = template[i];

    if (inString) {
      if (ch === "\\") {
        out += template.slice(i, i + 2);
        i += 2;
        continue;
      }
      if (ch === '"') {
        inString = false;
        out += ch;
        i += 1;
        continue;
      }
    } else if (ch === '"') {
      inString = true;
      out += ch;
      i += 1;
      continue;
    }

    const match = PLACEHOLDER.exec(template.slice(i));
    if (match) {
      const value = params[match[1]];
      out += inString ? escapeIntoJsonString(value) : asJsonValue(value);
      i += match[0].length;
      continue;
    }

    out += ch;
    i += 1;
  }

  return out;
}

/**
 * 只对看起来是 JSON 的 body 走 JSON 安全插值；表单/纯文本 body 保持朴素替换，
 * 避免把 `a={{x}}&b=1` 这种模板误加引号。
 */
export function interpolateBody(template: string, params: Record<string, unknown>): string {
  const trimmed = template.trimStart();
  const looksLikeJson = trimmed.startsWith("{") || trimmed.startsWith("[");
  return looksLikeJson ? interpolateJson(template, params) : interpolate(template, params);
}
