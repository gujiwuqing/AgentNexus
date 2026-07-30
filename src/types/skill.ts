export type SkillExample = {
  input: string;
  output: string;
};

export type Skill = {
  id: string;
  name: string;
  description: string;
  icon: string;
  tags: string[];
  category: string;
  instructions: string;
  examples: SkillExample[];
  recommendedTools: string[];
  createdAt: string;
  updatedAt: string;
};

export type SkillFormValues = {
  name: string;
  description: string;
  icon: string;
  tags: string[];
  category: string;
  instructions: string;
  examples: SkillExample[];
  recommendedTools: string[];
};
