export function executeCondition(input: string, expression: string): boolean {
  const [op, ...valueParts] = expression.split(":");
  const value = valueParts.join(":");
  switch (op) {
    case "contains":
      return input.includes(value);
    case "not_contains":
      return !input.includes(value);
    case "equals":
      return input === value;
    default:
      return false;
  }
}

export function executeTransform(
  input: string,
  operation: string,
  params: Record<string, string>
): string {
  switch (operation) {
    case "substring":
      return input.substring(
        Number(params.start ?? 0),
        params.end ? Number(params.end) : undefined
      );
    case "replace":
      return input.replace(params.search ?? "", params.replacement ?? "");
    case "jsonExtract": {
      try {
        const obj = JSON.parse(input);
        const keys = (params.path ?? "").split(".");
        let current: unknown = obj;
        for (const key of keys) {
          if (current == null || typeof current !== "object") return "";
          current = (current as Record<string, unknown>)[key];
        }
        return typeof current === "string" ? current : JSON.stringify(current);
      } catch {
        return "";
      }
    }
    case "template":
      return params.template ?? "";
    default:
      return input;
  }
}
