"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAgents } from "@/hooks/use-agents";
import type { Node } from "@xyflow/react";

function ConfigSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function NodeConfigDialog({
  node,
  allNodes,
  open,
  onClose,
  onSave,
}: {
  node: Node | null;
  allNodes: Node[];
  open: boolean;
  onClose: () => void;
  onSave: (nodeId: string, data: Record<string, unknown>) => void;
}) {
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [label, setLabel] = useState("");
  const [paramsText, setParamsText] = useState("{}");
  const [paramsError, setParamsError] = useState(false);
  const { data: agents } = useAgents();
  const t = useTranslations("workflowExt.configDialog");

  useEffect(() => {
    if (node) {
      const nodeConfig = (node.data?.config as Record<string, unknown>) ?? {};
      setConfig(nodeConfig);
      setLabel((node.data?.label as string) ?? "");
      setParamsText(JSON.stringify((nodeConfig.params as Record<string, string>) ?? {}, null, 2));
      setParamsError(false);
    }
  }, [node]);

  if (!node) return null;
  const nodeType = node.type ?? "";

  function handleSave() {
    onSave(node!.id, { ...node!.data, label, config });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("configure", { name: label || nodeType })}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("label")}</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>

          {nodeType === "agent" && (
            <>
              <div className="space-y-2">
                <Label>{t("agent")}</Label>
                <ConfigSelect
                  value={(config.agentId as string) ?? ""}
                  onChange={(v) => setConfig({ ...config, agentId: v })}
                  placeholder={t("selectAgent")}
                  options={(agents ?? []).map((a) => ({ value: a.id, label: `${a.avatar || "🤖"} ${a.name}` }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("promptTemplate")}</Label>
                <Textarea
                  rows={4}
                  value={(config.promptTemplate as string) ?? ""}
                  onChange={(e) => setConfig({ ...config, promptTemplate: e.target.value })}
                  placeholder={t("promptTemplatePlaceholder")}
                />
              </div>
            </>
          )}

          {nodeType === "condition" && (
            <>
              <div className="space-y-2">
                <Label>{t("expression")}</Label>
                <Input
                  value={(config.expression as string) ?? ""}
                  onChange={(e) => setConfig({ ...config, expression: e.target.value })}
                  placeholder="contains:keyword"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("inputNodeId")}</Label>
                <ConfigSelect
                  value={(config.inputNodeId as string) ?? ""}
                  onChange={(v) => setConfig({ ...config, inputNodeId: v })}
                  placeholder={t("selectNode")}
                  options={allNodes.filter((n) => n.id !== node.id).map((n) => ({ value: n.id, label: (n.data?.label as string) || n.id }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("trueBranch")}</Label>
                  <ConfigSelect
                    value={(config.trueBranch as string) ?? ""}
                    onChange={(v) => setConfig({ ...config, trueBranch: v })}
                    placeholder={t("selectNode")}
                    options={allNodes.filter((n) => n.id !== node.id).map((n) => ({ value: n.id, label: (n.data?.label as string) || n.id }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("falseBranch")}</Label>
                  <ConfigSelect
                    value={(config.falseBranch as string) ?? ""}
                    onChange={(v) => setConfig({ ...config, falseBranch: v })}
                    placeholder={t("selectNode")}
                    options={allNodes.filter((n) => n.id !== node.id).map((n) => ({ value: n.id, label: (n.data?.label as string) || n.id }))}
                  />
                </div>
              </div>
            </>
          )}

          {nodeType === "transform" && (
            <>
              <div className="space-y-2">
                <Label>{t("operation")}</Label>
                <ConfigSelect
                  value={(config.operation as string) ?? "template"}
                  onChange={(v) => setConfig({ ...config, operation: v })}
                  options={[
                    { value: "template", label: t("operationTemplate") },
                    { value: "substring", label: t("operationSubstring") },
                    { value: "replace", label: t("operationReplace") },
                    { value: "jsonExtract", label: t("operationJsonExtract") },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("inputTemplate")}</Label>
                <Input
                  value={(config.inputTemplate as string) ?? ""}
                  onChange={(e) => setConfig({ ...config, inputTemplate: e.target.value })}
                  placeholder="{{nodeId.output}}"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("params")}</Label>
                <Textarea
                  rows={3}
                  value={paramsText}
                  onChange={(e) => {
                    setParamsText(e.target.value);
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setConfig({ ...config, params: parsed });
                      setParamsError(false);
                    } catch {
                      setParamsError(true);
                    }
                  }}
                  placeholder='{"template": "{{a.output}} combined"}'
                />
                {paramsError && (
                  <p className="text-xs text-destructive">{t("invalidJson")}</p>
                )}
              </div>
            </>
          )}

          {nodeType === "human_input" && (
            <div className="space-y-2">
              <Label>{t("prompt")}</Label>
              <Textarea
                rows={3}
                value={(config.prompt as string) ?? ""}
                onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
                placeholder={t("promptPlaceholder")}
              />
            </div>
          )}

          {nodeType === "http_request" && (
            <>
              <div className="space-y-2">
                <Label>{t("url")}</Label>
                <Input
                  value={(config.url as string) ?? ""}
                  onChange={(e) => setConfig({ ...config, url: e.target.value })}
                  placeholder={t("urlPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("method")}</Label>
                <ConfigSelect
                  value={(config.method as string) ?? "GET"}
                  onChange={(v) => setConfig({ ...config, method: v })}
                  options={[
                    { value: "GET", label: "GET" },
                    { value: "POST", label: "POST" },
                    { value: "PUT", label: "PUT" },
                    { value: "DELETE", label: "DELETE" },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("headers")}</Label>
                <Textarea
                  rows={2}
                  value={JSON.stringify((config.headers as Record<string, string>) ?? {}, null, 2)}
                  onChange={(e) => {
                    try {
                      setConfig({ ...config, headers: JSON.parse(e.target.value) });
                    } catch {
                      // ignore invalid JSON while typing
                    }
                  }}
                  placeholder='{"Authorization": "Bearer ..."}'
                />
              </div>
              <div className="space-y-2">
                <Label>{t("bodyTemplate")}</Label>
                <Textarea
                  rows={3}
                  value={(config.bodyTemplate as string) ?? ""}
                  onChange={(e) => setConfig({ ...config, bodyTemplate: e.target.value })}
                  placeholder="{{input}}"
                />
              </div>
            </>
          )}

          {nodeType === "code_execute" && (
            <div className="space-y-2">
              <Label>{t("code")}</Label>
              <Textarea
                rows={6}
                className="font-mono text-xs"
                value={(config.code as string) ?? ""}
                onChange={(e) => setConfig({ ...config, code: e.target.value })}
                placeholder="return input.toUpperCase();"
              />
              <p className="text-xs text-muted-foreground">{t("codeHint")}</p>
            </div>
          )}

          {nodeType === "delay" && (
            <>
              <div className="space-y-2">
                <Label>{t("durationMs")}</Label>
                <Input
                  type="number"
                  min={0}
                  max={30000}
                  value={(config.durationMs as number) ?? 1000}
                  onChange={(e) => setConfig({ ...config, durationMs: Number(e.target.value) })}
                  placeholder={t("durationMsPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("inputNodeId")}</Label>
                <ConfigSelect
                  value={(config.inputNodeId as string) ?? ""}
                  onChange={(v) => setConfig({ ...config, inputNodeId: v })}
                  placeholder={t("selectNode")}
                  options={allNodes.filter((n) => n.id !== node.id).map((n) => ({ value: n.id, label: (n.data?.label as string) || n.id }))}
                />
              </div>
            </>
          )}

          {nodeType === "variable_aggregate" && (
            <div className="space-y-2">
              <Label>{t("sourceNodeIds")}</Label>
              <div className="space-y-1 max-h-40 overflow-y-auto border rounded-md p-2">
                {allNodes.filter((n) => n.id !== node.id).map((n) => {
                  const selected = ((config.sourceNodeIds as string[]) ?? []).includes(n.id);
                  return (
                    <label key={n.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(e) => {
                          const current = (config.sourceNodeIds as string[]) ?? [];
                          const next = e.target.checked
                            ? [...current, n.id]
                            : current.filter((id) => id !== n.id);
                          setConfig({ ...config, sourceNodeIds: next });
                        }}
                      />
                      {(n.data?.label as string) || n.id}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>{t("cancel")}</Button>
          <Button onClick={handleSave}>{t("apply")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
