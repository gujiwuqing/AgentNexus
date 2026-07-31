"use client";

type ActiveSkill = { name: string; icon: string };

export function SkillBadges({ skills }: { skills: ActiveSkill[] }) {
  if (skills.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2 mb-1">
      {skills.map((skill) => (
        <span
          key={skill.name}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/8 text-xs text-muted-foreground border border-primary/15"
        >
          <span className="text-[11px]">{skill.icon}</span>
          <span>{skill.name}</span>
        </span>
      ))}
    </div>
  );
}
