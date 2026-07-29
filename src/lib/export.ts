export function downloadFile(filename: string, content: string, mimeType = "application/json") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAgentJson(agent: {
  name: string;
  description: string;
  avatar: string;
  tags: string[];
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  topP: number;
}) {
  const data = {
    name: agent.name,
    description: agent.description,
    avatar: agent.avatar,
    tags: agent.tags,
    systemPrompt: agent.systemPrompt,
    temperature: agent.temperature,
    maxTokens: agent.maxTokens,
    topP: agent.topP,
  };
  const filename = `agent-${agent.name.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
  downloadFile(filename, JSON.stringify(data, null, 2));
}

export function exportConversationMarkdown(
  title: string,
  agentName: string,
  messages: { role: string; content: string; createdAt: string }[]
) {
  const lines = [
    `# ${title}`,
    `Agent: ${agentName}`,
    `Exported: ${new Date().toISOString()}`,
    "",
    "---",
    "",
  ];
  for (const m of messages) {
    const label = m.role === "user" ? "User" : m.role === "assistant" ? "Assistant" : m.role;
    const time = new Date(m.createdAt).toLocaleString();
    lines.push(`**${label}** (${time}):\n`);
    lines.push(m.content);
    lines.push("");
  }
  const filename = `chat-${title.replace(/[^a-zA-Z0-9]/g, "_")}-${new Date().toISOString().slice(0, 10)}.md`;
  downloadFile(filename, lines.join("\n"), "text/markdown");
}
