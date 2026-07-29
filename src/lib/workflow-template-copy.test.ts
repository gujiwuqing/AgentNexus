import { describe, expect, it } from "vitest";
import workflowExtEn from "../../messages/workflow-ext.en.json";
import workflowExtZhCN from "../../messages/workflow-ext.zh-CN.json";

describe("workflow template copy", () => {
  it("explains template creation and missing professional Agents in both locales", () => {
    expect(workflowExtEn.workflowExt.workflowTemplate).toEqual({
      heading: "Start from a workflow template",
      description: "Templates automatically configure stages, context passing, and human approval nodes.",
      missingAgents: "The required professional Agents for this template are missing. Run template initialization first.",
      buildHint: "You can also start with a blank workflow and add nodes in the editor.",
    });
    expect(workflowExtZhCN.workflowExt.workflowTemplate).toEqual({
      heading: "从工作流模板开始",
      description: "模板会自动配置阶段、上下文传递和人工确认节点。",
      missingAgents: "该模板所需的专业智能体不存在，请先运行模板初始化。",
      buildHint: "你也可以从空白工作流开始，再在编辑器中添加节点。",
    });
  });
});
