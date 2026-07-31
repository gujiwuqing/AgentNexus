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
};
