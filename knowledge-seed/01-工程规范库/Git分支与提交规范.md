# Git 分支与提交规范

> 用途：统一分支模型、提交信息、PR 流程，让协作历史清晰可追溯、可回滚、可自动化。
> 使用建议：挂载给「代码评审员」「技术方案师」Agent，用于判断提交/分支是否合规、指导发布流程。

## 一、分支模型（Trunk-Based，推荐中小团队）

- `main`：**始终可发布**。受保护，禁止直接 push，只能通过 PR 合入。
- 特性分支：从 `main` 切出，短生命周期（建议 ≤ 2~3 天），命名：
  - `feat/<简述>`：新功能，如 `feat/order-refund`
  - `fix/<简述>`：缺陷修复，如 `fix/login-null-token`
  - `chore/<简述>`：构建/依赖/杂项
  - `refactor/<简述>`：重构（不改行为）
  - `hotfix/<简述>`：线上紧急修复，从发布 tag/分支切出
- 分支尽早合入、频繁 rebase `main`，避免长期分叉导致大冲突。

> 若团队需要并行维护多个发布版本，可采用 Git Flow（`develop` + `release/*` + `hotfix/*`），但代价是流程更重，非必要不引入。

## 二、提交信息（Conventional Commits）

格式：

```
<type>(<scope>): <subject>

<body 可选：解释为什么，而非做了什么>

<footer 可选：BREAKING CHANGE / 关联单号>
```

**type 取值**：
| type | 含义 |
| --- | --- |
| `feat` | 新功能 |
| `fix` | 缺陷修复 |
| `docs` | 文档 |
| `style` | 格式（不影响逻辑） |
| `refactor` | 重构（不改行为、不修 bug） |
| `perf` | 性能优化 |
| `test` | 测试 |
| `build` / `ci` | 构建系统 / CI |
| `chore` | 杂项 |
| `revert` | 回滚某次提交 |

**规则**：
- subject 用祈使句、现在时、≤ 50 字，结尾不加句号（"add" 而非 "added"）。
- 一次提交只做一件事；不要把无关改动混在一起。
- body 说明动机与权衡；footer 关联需求/缺陷单（如 `Closes #123`）。
- 破坏性变更必须在 footer 写 `BREAKING CHANGE: <说明>`。

**示例**：
```
feat(order): 支持退款单幂等提交

同一退款请求重复提交会产生多笔退款。引入 requestId 唯一约束，
重复请求直接返回首次结果，避免资损。

Closes #482
```

## 三、Pull Request 规范

- PR 标题遵循与提交同样的 `<type>: <subject>` 规范。
- 描述包含：**背景/目的、改动点、验证方式、影响面与回滚方案**、关联单号。
- 单个 PR 聚焦单一目的；diff 尽量 < 400 行，超大改动拆分或分阶段。
- 自测通过 + CI 绿 + 无冲突，才请求评审。
- 至少 1 名 Reviewer 批准（核心链路建议 2 名）方可合入。

## 四、合入策略

- 推荐 **Squash Merge**：把特性分支压成一条符合规范的提交进入 `main`，历史线性干净。
- 合入后删除特性分支。
- 禁止对 `main` 强推（force push）；禁止跳过 CI 与保护规则。

## 五、版本与发布

- 语义化版本 `MAJOR.MINOR.PATCH`：
  - `MAJOR`：不兼容变更；`MINOR`：向后兼容的新功能；`PATCH`：向后兼容的修复。
- 发布打 tag（如 `v1.4.0`），基于 Conventional Commits 自动生成 CHANGELOG。
- 每次发布记录：版本、范围、风险、回滚方式、负责人。

## 六、常见反模式（评审应拦截）

- 提交信息写 "update"、"fix bug"、"111" 等无信息量内容。
- 一个 PR 里既重构又改功能又改格式，无法评审也无法回滚。
- 长期不合入的巨型分支。
- 把生成物、依赖目录、本地配置、密钥误提交（应由 `.gitignore` 兜底）。
