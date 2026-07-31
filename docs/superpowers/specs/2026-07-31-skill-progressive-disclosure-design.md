# Skill 机制重构 — 渐进式披露与触发驱动设计

## 概述

参照 Claude 官方 Agent Skills 架构（渐进式披露 + 语义触发 + 资源分层 + 执行上下文联动），彻底重构 AgentNexus 现有 Skill 机制。

**现状问题**：Agent 挂载的 Skill 无论用户问什么，`content` 全文**无条件**拼进 system prompt。挂 6 个 Skill、每个 2000 字，每次对话都要背 12000 字说明书，且没有任何"是否用得上"的判断——这正是 Claude 用渐进式披露解决的核心痛点，我们完全没解决。

**目标**：把"全量注入"改为"按需加载"，把 `description` 从纯展示文案升级为真正的路由依据，并补齐资源分层与工具权限联动能力。

---

## 一、Claude 官方机制（设计依据）

1. **触发机制**：纯语言理解，无算法路由。所有已装 Skill 的 `name`+`description` 常驻上下文（元数据层），模型判断相关时**主动调用**加载完整内容，代码层不做向量检索/关键词匹配。
2. **渐进式披露三层**：L1 元数据（始终加载，~100 token/个）→ L2 指令（SKILL.md 正文，判断相关后加载）→ L3 资源（`references/`、`scripts/`，执行中按需读取）。
3. **资源分层的真实机制**：Claude 运行在有文件系统访问权的沙盒 VM 里，Skill 是磁盘上的文件夹，L3 资源通过 Claude **本来就有的通用 Read 工具**读取，不是专门的技能资源工具。
4. **`allowed-tools`**：SKILL.md frontmatter 字段，Skill 激活期间收紧可用工具范围，是执行层的强制拦截，不是模型层的"隐藏定义"。
5. **Skill/Tool/MCP/Subagent 分工**：MCP 提供 access，Tools 提供 capability，Skills 提供 expertise（方法论），Subagents 提供 isolation。四者协同而非竞争。

---

## 二、数据模型变更

`skills` 表新增两个可选字段：

```typescript
resources: json("resources").$type<Array<{ title: string; content: string }>>().default([])
allowedTools: json("allowed_tools").$type<string[]>().default([])
```

- `resources`：对应 Claude 的 L3 资源层，正文中可通过"详见 XXX"的方式引用
- `allowedTools`：Skill 激活期间允许搭配使用的工具名单，空数组表示不限制
- `description` 字段不变 schema，但**用途升级**为路由依据（见第三部分）

不涉及破坏性迁移——两个字段都是新增可选列，默认空数组。

---

## 三、运行时机制

### 3.1 Skill 元工具（替代全量注入）

新建 `src/lib/skills/skill-tools.ts`，提供两个工具构建函数：

**`buildLoadSkillTool(skills)`**：单一元工具 `load_skill`，`description` 动态罗列所有挂载 Skill 的 `name` + `description`（即 L1 元数据层，这是 `description` 字段真正发挥路由作用的地方）。`parameters` 是 `skillName` 的枚举（限定为已挂载的 Skill 名称）。`execute` 返回该 Skill 的 `content` 全文（L2 层，作为 tool result 进入上下文）。

**`buildReadSkillResourceTool(skills)`**：单一元工具 `read_skill_resource`，`parameters` 为 `{ skillName, resourceTitle }`，`execute` 返回该 Skill 对应 `resources` 条目的 `content`（L3 层）。若 Skill 无 `resources`，此工具仍会挂载但调用会返回"未找到"提示（不特殊处理，交给模型自然处理）。

**关键变化**：Agent 的 `systemPrompt` 不再被 Skill 内容污染，恢复纯粹的身份定义。Skill 完全通过工具调用通道注入，且只有被模型判断为相关、主动调用后才真正进入上下文。

### 3.2 `allowedTools` 运行时拦截

新建 `src/lib/tools/skill-guard.ts`：

```typescript
function wrapWithSkillGuard(tools: Record<string, CoreTool>): Record<string, CoreTool>
```

包装规则：
- 用一个运行时可变的 `Set<string>`（贯穿本次 `streamText`/`generateText` 调用的所有 step）记录"本轮已激活的 allowedTools 并集"
- 包装 `load_skill` 的 `execute`：调用成功后，若该 Skill 设置了非空 `allowedTools`，将其并入运行时并集
- 包装其余所有工具（内置/自定义/团队委派）的 `execute`：执行前检查——若运行时并集非空且当前工具名不在并集里，直接返回拒绝提示，不执行原逻辑
- **`load_skill` 与 `read_skill_resource` 自身始终豁免检查**：不管当前并集是什么，这两个元工具永远可调用——否则一旦某个 Skill 收紧了工具范围，模型就无法再切换到其他 Skill 或读取参考资料，等于把自己锁死
- **多 Skill 同时激活时用并集而非交集**：避免出现两个 Skill 的允许列表无交集导致模型完全无法使用任何工具的死锁

此包装在 `resolveAgentTools` 组装完全部工具（内置 + 自定义 + Skill 元工具 + 团队委派）之后，统一在最后一步应用。

### 3.3 三处调用点替换

| 文件 | 现状 | 改为 |
|---|---|---|
| `src/app/api/conversations/[id]/messages/route.ts` | `buildSkillSystemPrompt` 全量拼进 system prompt | 挂载 `load_skill`/`read_skill_resource` 到 tools；system prompt 不再包含 Skill 内容 |
| `src/server/agent-team.ts`（`callTeamMember`） | 同上，委派给成员 Agent 时全量注入 | 同步替换为工具化机制 |
| `src/lib/evals/runner.ts`（`runEvalCase`） | 同上，且**当前评测完全没有挂载任何 tools** | 补上工具挂载（含 Skill 元工具），否则移除全量注入后评测会彻底丢失 Skill 行为——必须同步修复，不能只删不补 |

`src/lib/skills/prompt-builder.ts` 中的 `buildSkillSystemPrompt` 函数整体废弃删除（三处调用点全部迁移完成后不再有引用）。

### 3.4 Skill 使用徽章语义修正

现有 `activeSkills` 徽章逻辑：只要 Agent 挂载了 Skill 就无条件展示全部，不管是否真的用到——这是"全量假打开"问题在 UI 层的另一处体现。

改为：从本轮 `meta.toolCalls` 中筛出 `toolName === "load_skill"` 的调用记录，提取其 `args.skillName`，只展示**真正被加载过**的 Skill 徽章。数据来源从"查询 `agentSkillRows`（全部挂载）"改为"派生自实际 `toolCalls`（实际调用）"，不需要额外的运行时状态追踪。

---

## 四、前端改动

### 4.1 Skill 编辑表单（`skill-form.tsx`）

在现有字段基础上新增两块，`resources` 与 `allowedTools`：

- **description 字段**下方新增引导文案，提示用户写清楚"做什么 + 什么时候用 + 什么时候不用"，因为这段文字将直接构成 `load_skill` 工具的 description（即模型做路由判断的唯一依据）
- **新增"参考资料"编辑器**：复用现有 `skill-examples-editor.tsx` 的交互模式（增删卡片），每张卡片含 `title`（单行）+ `content`（多行文本框）两个字段
- **新增"允许搭配的工具"多选**：复用 `AgentCustomToolsConfig` 的多选交互模式，列出用户全部自定义工具供勾选；留空表示不限制，勾选后提示"此技能激活期间，对话只能使用勾选的工具"

### 4.2 调试面板（`trace-panel.tsx`）

已有的"注入的 Skills"展示项语义修正：从"Agent 挂载的全部 Skill"改为"本轮真正被 `load_skill` 加载的 Skill"。数据来源同 3.4，从消息的 `toolCalls` 派生，而非查询全部挂载记录。

### 4.3 类型与验证同步

- `src/types/skill.ts`：`Skill` 与 `SkillFormValues` 新增 `resources: Array<{title, content}>`、`allowedTools: string[]`
- `src/lib/validation/skill.ts`：`skillInputSchema` 新增对应 Zod 校验（`resources` 数组，`allowedTools` 字符串数组，均默认 `[]`）

---

## 五、不在本期范围

- Skill 触发的算法化改造（向量检索/关键词匹配）——保持与 Claude 一致的"纯语言理解决策"，不引入额外的路由算法
- 多 Skill 权限交集/更复杂的优先级规则——本期用简单并集规则
- Skill 携带可执行脚本（Claude 的 `scripts/`）——`resources` 仅支持文本类参考资料，不支持挂载可执行代码
- Skill 激活时切换模型——公开资料未能验证 Claude 官方标准机制中存在此项，本期不做

---

## 六、验证方式

1. 创建一个含 `resources` 和 `allowedTools` 的 Skill，挂载到 Agent
2. 与该 Agent 对话，发一个明显不相关的问题——检查 system prompt 是否干净（不含 Skill 内容），检查该 Skill 是否**没有**被加载（无徽章展示）
3. 发一个明显匹配该 Skill 场景的问题——检查模型是否主动调用 `load_skill`，检查徽章是否正确展示该 Skill
4. 若该 Skill 设置了 `allowedTools`，检查激活后模型尝试调用非允许工具时是否被拦截
5. 触发团队委派场景，确认成员 Agent 的 Skill 也走同一套工具化机制
6. 运行一次 Agent 评测（Evals），确认评测执行时 Skill 行为仍然生效（工具已正确挂载）
