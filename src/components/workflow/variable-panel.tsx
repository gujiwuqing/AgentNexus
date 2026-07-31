"use client";

import { Plus, X, Variable } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WorkflowVariable } from "@/types/workflow";

export function VariablePanel({
  variables,
  onChange,
}: {
  variables: WorkflowVariable[];
  onChange: (variables: WorkflowVariable[]) => void;
}) {
  function addVariable() {
    onChange([...variables, { name: "", type: "string", defaultValue: "", description: "" }]);
  }

  function removeVariable(index: number) {
    onChange(variables.filter((_, i) => i !== index));
  }

  function updateVariable(index: number, field: keyof WorkflowVariable, value: string) {
    const updated = variables.map((v, i) => (i === index ? { ...v, [field]: value } : v));
    onChange(updated);
  }

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-1.5">
          <Variable className="h-3.5 w-3.5" />
          全局变量
        </h3>
        <Button type="button" variant="outline" size="sm" onClick={addVariable}>
          <Plus className="h-3 w-3 mr-1" />
          添加变量
        </Button>
      </div>

      {variables.length === 0 && (
        <p className="text-xs text-muted-foreground">
          暂无全局变量。变量可在节点的输入/输出映射中通过 {"{{global.变量名}}"} 引用。
        </p>
      )}

      {variables.map((v, i) => (
        <div key={i} className="relative border rounded-lg p-3 space-y-2">
          <button
            type="button"
            onClick={() => removeVariable(i)}
            className="absolute top-2 right-2 p-1 rounded hover:bg-muted text-muted-foreground"
          >
            <X className="h-3 w-3" />
          </button>
          <Input
            value={v.name}
            onChange={(e) => updateVariable(i, "name", e.target.value)}
            placeholder="变量名"
            className="text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={v.type}
              onChange={(e) => updateVariable(i, "type", e.target.value)}
              className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="string">string</option>
              <option value="number">number</option>
              <option value="boolean">boolean</option>
              <option value="json">json</option>
            </select>
            <Input
              value={v.defaultValue ?? ""}
              onChange={(e) => updateVariable(i, "defaultValue", e.target.value)}
              placeholder="默认值"
              className="text-sm h-8"
            />
          </div>
          <Input
            value={v.description ?? ""}
            onChange={(e) => updateVariable(i, "description", e.target.value)}
            placeholder="说明（可选）"
            className="text-xs h-7"
          />
        </div>
      ))}
    </div>
  );
}
