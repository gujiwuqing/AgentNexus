export function resolveTemplate(
  template: string,
  vars: { input: string; context: Record<string, string> }
): string {
  return template
    .replace(/\{\{input\}\}/g, vars.input)
    .replace(/\{\{(\w+)\.output\}\}/g, (match, nodeId) => {
      return vars.context[nodeId] ?? match;
    });
}
