export type Agent = {
  id: string;
  name: string;
  description: string;
  avatar: string;
  tags: string[];
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  model: string | null;
  memoryWindowSize: number;
  toolsConfig: unknown;
  createdAt: string;
  updatedAt: string;
  conversationCount?: number;
  lastActiveAt?: string | null;
};

export type AgentFormValues = {
  name: string;
  description: string;
  avatar: string;
  tags: string[];
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  model: string | null;
  memoryWindowSize: number;
  toolsConfig: { enabledTools: string[] };
};
