type SkillForPrompt = {
  name: string;
  content: string;
};

export function buildSkillSystemPrompt(skills: SkillForPrompt[]): string {
  if (skills.length === 0) return "";

  const sections = skills.map((skill) => {
    return `## 技能：${skill.name}\n\n${skill.content}`;
  });

  return "\n\n---\n你具备以下专业技能，请在相关任务中自动运用：\n\n" + sections.join("\n\n---\n\n");
}
