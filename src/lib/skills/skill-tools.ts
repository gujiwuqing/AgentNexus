import { tool, type CoreTool } from "ai";
import { z } from "zod";

export type SkillForTools = {
  name: string;
  description: string;
  icon: string;
  content: string;
  resources: Array<{ title: string; content: string }>;
  allowedTools: string[];
};

/**
 * L1（元数据）+ L2（正文）：description 罗列全部挂载 Skill 的 name+description，
 * 模型判断相关时调用，execute 返回该 Skill 的完整 content。
 */
export function buildLoadSkillTool(skills: SkillForTools[]): CoreTool | null {
  if (skills.length === 0) return null;
  const catalog = skills.map((s) => `- ${s.name}：${s.description}`).join("\n");
  const names = skills.map((s) => s.name) as [string, ...string[]];

  return tool({
    description: `可用技能列表，相关时调用以加载完整说明：\n${catalog}`,
    parameters: z.object({
      skillName: z.enum(names).describe("要加载的技能名称"),
    }),
    execute: async ({ skillName }) => {
      const skill = skills.find((s) => s.name === skillName);
      return skill ? skill.content : `未找到技能：${skillName}`;
    },
  });
}

/**
 * L3（资源层）：模型在 Skill 正文中看到"详见 XXX"之类的引用时调用，
 * 读取该 Skill 对应的参考资料全文。
 */
export function buildReadSkillResourceTool(skills: SkillForTools[]): CoreTool | null {
  if (skills.length === 0) return null;
  const names = skills.map((s) => s.name) as [string, ...string[]];

  return tool({
    description: "读取某个技能的参考资料（当技能正文提示'详见 XXX'时调用）",
    parameters: z.object({
      skillName: z.enum(names).describe("技能名称"),
      resourceTitle: z.string().describe("参考资料标题"),
    }),
    execute: async ({ skillName, resourceTitle }) => {
      const skill = skills.find((s) => s.name === skillName);
      const resource = skill?.resources.find((r) => r.title === resourceTitle);
      return resource ? resource.content : `未找到参考资料：${resourceTitle}`;
    },
  });
}
