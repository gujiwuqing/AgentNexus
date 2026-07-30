type SkillForPrompt = {
  name: string;
  instructions: string;
  examples: Array<{ input: string; output: string }>;
};

export function buildSkillSystemPrompt(skills: SkillForPrompt[]): string {
  if (skills.length === 0) return "";

  const sections = skills.map((skill) => {
    let section = `## 技能：${skill.name}\n${skill.instructions}`;
    if (skill.examples.length > 0) {
      section += "\n\n参考示例：";
      for (const ex of skill.examples) {
        section += `\n用户：${ex.input}\n助手：${ex.output}`;
      }
    }
    return section;
  });

  return "\n\n---\n你具备以下专业技能，请在相关任务中自动运用：\n\n" + sections.join("\n\n");
}
