export type SkillResource = {
  title: string;
  content: string;
};

export type Skill = {
  id: string;
  name: string;
  description: string;
  icon: string;
  tags: string[];
  category: string;
  version: string;
  argumentHint: string;
  content: string;
  resources: SkillResource[];
  allowedTools: string[];
  createdAt: string;
  updatedAt: string;
};

export type SkillFormValues = {
  name: string;
  description: string;
  icon: string;
  tags: string[];
  category: string;
  version: string;
  argumentHint: string;
  content: string;
  resources: SkillResource[];
  allowedTools: string[];
};
