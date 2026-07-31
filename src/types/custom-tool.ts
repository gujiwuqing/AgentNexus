export type HttpToolConfig = {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  bodyTemplate?: string;
  queryTemplate?: Record<string, string>;
};

export type PromptToolConfig = {
  systemInstruction: string;
  outputFormat?: string;
};

export type McpToolConfig = {
  serverUrl: string;
  toolName: string;
  authToken?: string;
};

export type ToolParameter = {
  name: string;
  type: "string" | "number" | "boolean";
  description: string;
  required: boolean;
  default?: string | number | boolean;
};

export type CustomTool = {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon: string;
  tags: string[];
  type: "http" | "prompt" | "mcp";
  httpConfig: HttpToolConfig | null;
  promptConfig: PromptToolConfig | null;
  mcpConfig: McpToolConfig | null;
  parameters: ToolParameter[];
  createdAt: string;
  updatedAt: string;
};

export type CustomToolFormValues = {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  tags: string[];
  type: "http" | "prompt" | "mcp";
  httpConfig: HttpToolConfig | null;
  promptConfig: PromptToolConfig | null;
  mcpConfig: McpToolConfig | null;
  parameters: ToolParameter[];
};
