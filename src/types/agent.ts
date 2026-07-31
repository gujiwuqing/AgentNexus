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
  memoryStrategy: "window" | "summary_window";
  toolsConfig: unknown;
  suggestedPrompts: string[];
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
  memoryStrategy: "window" | "summary_window";
  toolsConfig: { enabledTools: string[] };
  suggestedPrompts: string[];
};
