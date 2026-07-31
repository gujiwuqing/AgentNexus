import type { CoreTool } from "ai";

/** 这两个元工具永远豁免拦截，否则一旦某个 Skill 收紧了范围，模型就无法再切换 Skill 或读参考资料。 */
const EXEMPT_TOOL_NAMES = new Set(["load_skill", "read_skill_resource"]);

/**
 * 包装工具集：当模型调用 load_skill 加载了一个设置了 allowedTools 的 Skill 后，
 * 本次调用剩余的所有 step 里，非豁免工具只能在该 Skill（或其他已激活 Skill）的
 * allowedTools 并集范围内执行；不在范围内直接返回拒绝提示，不执行原逻辑。
 *
 * 状态（activeUnion/restricted）通过闭包在同一次 resolveAgentTools() 调用产生的
 * 工具集上共享，天然贯穿一次 streamText/generateText 调用的所有 step。
 */
export function wrapWithSkillGuard(
  tools: Record<string, CoreTool>,
  skillAllowedToolsByName: Record<string, string[]>,
): Record<string, CoreTool> {
  const hasAnyRestriction = Object.values(skillAllowedToolsByName).some((list) => list.length > 0);
  if (!hasAnyRestriction) return tools;

  const activeUnion = new Set<string>();
  let restricted = false;

  const wrapped: Record<string, CoreTool> = {};

  for (const [name, def] of Object.entries(tools)) {
    const originalExecute = def.execute;
    if (!originalExecute) {
      wrapped[name] = def;
      continue;
    }

    if (name === "load_skill") {
      wrapped[name] = {
        ...def,
        execute: async (params: Record<string, unknown>, options) => {
          const result = await originalExecute(params, options);
          const skillName = params?.skillName as string | undefined;
          const allowList = skillName ? skillAllowedToolsByName[skillName] : undefined;
          if (allowList && allowList.length > 0) {
            restricted = true;
            for (const toolName of allowList) activeUnion.add(toolName);
          }
          return result;
        },
      } as CoreTool;
    } else if (EXEMPT_TOOL_NAMES.has(name)) {
      wrapped[name] = def;
    } else {
      wrapped[name] = {
        ...def,
        execute: async (params: Record<string, unknown>, options) => {
          if (restricted && !activeUnion.has(name)) {
            return "该工具在当前技能激活期间不可用（技能设置了允许的工具范围）。";
          }
          return originalExecute(params, options);
        },
      } as CoreTool;
    }
  }

  return wrapped;
}
