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
import { useAgents } from "@/hooks/use-agents";
import type { Node } from "@xyflow/react";

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
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={(config.agentId as string) ?? ""}
                  onChange={(e) => setConfig({ ...config, agentId: e.target.value })}
                >
                  <option value="">{t("selectAgent")}</option>
                  {agents?.map((a) => (
                    <option key={a.id} value={a.id}>{a.avatar || "🤖"} {a.name}</option>
                  ))}
                </select>
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
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={(config.inputNodeId as string) ?? ""}
                  onChange={(e) => setConfig({ ...config, inputNodeId: e.target.value })}
                >
                  <option value="">{t("selectNode")}</option>
                  {allNodes.filter((n) => n.id !== node.id).map((n) => (
                    <option key={n.id} value={n.id}>{(n.data?.label as string) || n.id}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("trueBranch")}</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={(config.trueBranch as string) ?? ""}
                    onChange={(e) => setConfig({ ...config, trueBranch: e.target.value })}
                  >
                    <option value="">{t("selectNode")}</option>
                    {allNodes.filter((n) => n.id !== node.id).map((n) => (
                      <option key={n.id} value={n.id}>{(n.data?.label as string) || n.id}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{t("falseBranch")}</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={(config.falseBranch as string) ?? ""}
                    onChange={(e) => setConfig({ ...config, falseBranch: e.target.value })}
                  >
                    <option value="">{t("selectNode")}</option>
                    {allNodes.filter((n) => n.id !== node.id).map((n) => (
                      <option key={n.id} value={n.id}>{(n.data?.label as string) || n.id}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {nodeType === "transform" && (
            <>
              <div className="space-y-2">
                <Label>{t("operation")}</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={(config.operation as string) ?? "template"}
                  onChange={(e) => setConfig({ ...config, operation: e.target.value })}
                >
                  <option value="template">{t("operationTemplate")}</option>
                  <option value="substring">{t("operationSubstring")}</option>
                  <option value="replace">{t("operationReplace")}</option>
                  <option value="jsonExtract">{t("operationJsonExtract")}</option>
                </select>
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
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={(config.method as string) ?? "GET"}
                  onChange={(e) => setConfig({ ...config, method: e.target.value })}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
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
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={(config.inputNodeId as string) ?? ""}
                  onChange={(e) => setConfig({ ...config, inputNodeId: e.target.value })}
                >
                  <option value="">{t("selectNode")}</option>
                  {allNodes.filter((n) => n.id !== node.id).map((n) => (
                    <option key={n.id} value={n.id}>{(n.data?.label as string) || n.id}</option>
                  ))}
                </select>
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
