import { describe, it, expect, afterEach } from "vitest";
import { clearAllTables, authedUser } from "@/db/test-helpers";
import { createAgent } from "./agents";
import { createSkill } from "./skills";
import { createCustomTool } from "./custom-tools";
import { setAgentSkills } from "./agent-skills";
import { setAgentCustomTools } from "./agent-custom-tools";
import { setTeamMembers } from "./agent-team";
import { getProviderConfig } from "./provider-config";
import {
  assembleAgentToolset,
  resolveMaxSteps,
  resolveRagTopK,
  MAX_DELEGATION_DEPTH,
} from "./agent-runtime";
import { DEFAULT_MAX_STEPS } from "@/lib/ai/chat";

afterEach(clearAllTables);

const agentDefaults = {
  description: "",
  avatar: "",
  tags: [] as string[],
  systemPrompt: "you are a test agent",
  temperature: 0.7,
  maxTokens: 1024,
  topP: 1,
  model: null,
};

async function makeAgent(userId: string, name: string, toolsConfig?: unknown) {
  return createAgent({ ...agentDefaults, name, ...(toolsConfig ? { toolsConfig } : {}) } as never, userId);
}

describe("resolveMaxSteps", () => {
  it("falls back to the default when unset or invalid", () => {
    expect(resolveMaxSteps({ toolsConfig: null })).toBe(DEFAULT_MAX_STEPS);
    expect(resolveMaxSteps({ toolsConfig: {} })).toBe(DEFAULT_MAX_STEPS);
    expect(resolveMaxSteps({ toolsConfig: { maxSteps: "8" } })).toBe(DEFAULT_MAX_STEPS);
    expect(resolveMaxSteps({ toolsConfig: { maxSteps: Number.NaN } })).toBe(DEFAULT_MAX_STEPS);
  });

  it("honours a configured value and clamps it to a sane range", () => {
    expect(resolveMaxSteps({ toolsConfig: { maxSteps: 20 } })).toBe(20);
    expect(resolveMaxSteps({ toolsConfig: { maxSteps: 0 } })).toBe(1);
    expect(resolveMaxSteps({ toolsConfig: { maxSteps: -5 } })).toBe(1);
    expect(resolveMaxSteps({ toolsConfig: { maxSteps: 999 } })).toBe(40);
  });
});

describe("resolveRagTopK", () => {
  it("defaults to 5 and clamps out-of-range values", () => {
    expect(resolveRagTopK({ toolsConfig: null })).toBe(5);
    expect(resolveRagTopK({ toolsConfig: { ragTopK: 8 } })).toBe(8);
    expect(resolveRagTopK({ toolsConfig: { ragTopK: 0 } })).toBe(1);
    expect(resolveRagTopK({ toolsConfig: { ragTopK: 500 } })).toBe(50);
  });
});

describe("assembleAgentToolset", () => {
  it("returns undefined tools when the agent has nothing attached", async () => {
    const { user } = await authedUser();
    const agent = await makeAgent(user.id, "Bare");
    const config = await getProviderConfig(user.id);

    const result = await assembleAgentToolset(agent!, config);
    expect(result.tools).toBeUndefined();
    expect(result.skills).toEqual([]);
    expect(result.customTools).toEqual([]);
    expect(result.teamMembers).toEqual([]);
  });

  it("mounts builtin tools from the enabledTools whitelist", async () => {
    const { user } = await authedUser();
    const agent = await makeAgent(user.id, "Builtin", { enabledTools: ["current_time", "not_a_real_tool"] });
    const config = await getProviderConfig(user.id);

    const { tools } = await assembleAgentToolset(agent!, config);
    expect(Object.keys(tools ?? {})).toEqual(["current_time"]);
  });

  it("exposes skills through the two meta tools instead of the system prompt", async () => {
    const { user } = await authedUser();
    const agent = await makeAgent(user.id, "WithSkill");
    const skill = await createSkill(
      {
        name: "code-review",
        description: "review code",
        icon: "🧪",
        tags: [],
        category: "",
        version: "1.0.0",
        argumentHint: "",
        content: "full skill body",
        resources: [{ title: "checklist", content: "the checklist" }],
        allowedTools: [],
      } as never,
      user.id,
    );
    await setAgentSkills(agent!.id, [skill!.id], user.id);
    const config = await getProviderConfig(user.id);

    const { tools, skills } = await assembleAgentToolset(agent!, config);
    expect(Object.keys(tools ?? {}).sort()).toEqual(["load_skill", "read_skill_resource"]);
    expect(skills.map((s) => s.name)).toEqual(["code-review"]);
    // L1 目录（name + description）暴露在工具描述里，正文不进 prompt
    expect(tools?.load_skill?.description).toContain("code-review");
    expect(tools?.load_skill?.description).toContain("review code");
    expect(tools?.load_skill?.description).not.toContain("full skill body");
  });

  it("mounts custom tools linked to the agent", async () => {
    const { user } = await authedUser();
    const agent = await makeAgent(user.id, "WithCustom");
    const customTool = await createCustomTool(
      {
        name: "weather_lookup",
        displayName: "Weather",
        description: "look up weather",
        icon: "",
        tags: [],
        type: "http",
        httpConfig: { url: "https://api.example.com/w", method: "GET" },
        promptConfig: null,
        mcpConfig: null,
        parameters: [{ name: "city", type: "string", description: "city", required: true }],
      } as never,
      user.id,
    );
    await setAgentCustomTools(agent!.id, [customTool!.id], user.id);
    const config = await getProviderConfig(user.id);

    const { tools, customTools } = await assembleAgentToolset(agent!, config);
    expect(Object.keys(tools ?? {})).toContain("weather_lookup");
    expect(customTools.map((t) => t.name)).toEqual(["weather_lookup"]);
  });

  it("mounts one delegation tool per team member", async () => {
    const { user } = await authedUser();
    const lead = await makeAgent(user.id, "Lead");
    const member = await makeAgent(user.id, "Member");
    await setTeamMembers(lead!.id, [{ memberAgentId: member!.id, roleDescription: "does research" }]);
    const config = await getProviderConfig(user.id);

    const { tools, teamMembers } = await assembleAgentToolset(lead!, config);
    expect(Object.keys(tools ?? {})).toEqual([`delegate_to_${member!.id}`]);
    expect(teamMembers).toHaveLength(1);
  });

  // 去环：成员不能反向委托回委托链上已有的 Agent
  it("omits a delegation tool for an agent already on the delegation chain", async () => {
    const { user } = await authedUser();
    const lead = await makeAgent(user.id, "Lead");
    const member = await makeAgent(user.id, "Member");
    await setTeamMembers(member!.id, [{ memberAgentId: lead!.id, roleDescription: "back to lead" }]);
    const config = await getProviderConfig(user.id);

    const { tools } = await assembleAgentToolset(member!, config, { depth: 1, chain: [lead!.id] });
    expect(tools).toBeUndefined();
  });

  it("stops loading team members once the depth limit is reached", async () => {
    const { user } = await authedUser();
    const lead = await makeAgent(user.id, "Lead");
    const member = await makeAgent(user.id, "Member");
    await setTeamMembers(lead!.id, [{ memberAgentId: member!.id, roleDescription: "r" }]);
    const config = await getProviderConfig(user.id);

    const atLimit = await assembleAgentToolset(lead!, config, {
      depth: MAX_DELEGATION_DEPTH,
      chain: [],
    });
    expect(atLimit.teamMembers).toEqual([]);
    expect(atLimit.tools).toBeUndefined();
  });

  it("combines builtin, custom, team and skill tools in one toolset", async () => {
    const { user } = await authedUser();
    const lead = await makeAgent(user.id, "Full", { enabledTools: ["current_time"] });
    const member = await makeAgent(user.id, "Member");
    await setTeamMembers(lead!.id, [{ memberAgentId: member!.id, roleDescription: "r" }]);
    const skill = await createSkill(
      {
        name: "s1",
        description: "d1",
        icon: "",
        tags: [],
        category: "",
        version: "1.0.0",
        argumentHint: "",
        content: "c1",
        resources: [],
        allowedTools: [],
      } as never,
      user.id,
    );
    await setAgentSkills(lead!.id, [skill!.id], user.id);
    const customTool = await createCustomTool(
      {
        name: "ct1",
        displayName: "CT1",
        description: "d",
        icon: "",
        tags: [],
        type: "prompt",
        httpConfig: null,
        promptConfig: { systemInstruction: "do it" },
        mcpConfig: null,
        parameters: [],
      } as never,
      user.id,
    );
    await setAgentCustomTools(lead!.id, [customTool!.id], user.id);
    const config = await getProviderConfig(user.id);

    const { tools } = await assembleAgentToolset(lead!, config);
    expect(Object.keys(tools ?? {}).sort()).toEqual(
      [
        "ct1",
        "current_time",
        `delegate_to_${member!.id}`,
        "load_skill",
        "read_skill_resource",
      ].sort(),
    );
  });
});
