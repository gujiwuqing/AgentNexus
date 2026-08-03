"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMessageTrace } from "@/hooks/use-message-trace";
import { Skeleton } from "@/components/ui/skeleton";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</h4>
      {children}
    </div>
  );
}

function CodeBlock({ content }: { content: string }) {
  return (
    <pre className="text-xs whitespace-pre-wrap bg-muted/50 rounded-md p-3 max-h-64 overflow-y-auto border">
      {content}
    </pre>
  );
}

export function TracePanel({
  messageId,
  open,
  onClose,
  actualToolCalls,
  actualSkills,
}: {
  messageId: string;
  open: boolean;
  onClose: () => void;
  actualToolCalls?: Array<{ toolName: string; displayName: string; args: Record<string, unknown>; result: string }>;
  actualSkills?: Array<{ name: string; icon: string }> | null;
}) {
  const { data: trace, isLoading } = useMessageTrace(messageId, open);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>调试信息</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {!isLoading && !trace && (
          <p className="text-sm text-muted-foreground">此消息没有可用的调试信息（可能是历史数据）。</p>
        )}

        {trace && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">模型</span>
                <p className="font-medium">{trace.modelUsed ?? "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">耗时</span>
                <p className="font-medium">{trace.latencyMs != null ? `${trace.latencyMs}ms` : "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Token</span>
                <p className="font-medium">
                  {trace.tokenDetails?.total != null
                    ? `${trace.tokenDetails.total} (入${trace.tokenDetails.input ?? "-"}/出${trace.tokenDetails.output ?? "-"})`
                    : "-"}
                </p>
              </div>
            </div>

            {trace.skillsInjected && trace.skillsInjected.length > 0 && (
              <Section title="注入的 Skills">
                <div className="flex flex-wrap gap-1.5">
                  {trace.skillsInjected.map((s) => (
                    <span key={s.name} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 border">
                      {s.icon} {s.name}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {trace.toolsAvailable && trace.toolsAvailable.length > 0 && (
              <Section title="可用的 Tools">
                <div className="flex flex-wrap gap-1.5">
                  {trace.toolsAvailable.map((name) => (
                    <span key={name} className="text-xs px-2 py-0.5 rounded-full bg-muted border font-mono">
                      {name}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {actualSkills && actualSkills.length > 0 && (
              <Section title="实际调用的 Skills">
                <div className="flex flex-wrap gap-1.5">
                  {actualSkills.map((s) => (
                    <span key={s.name} className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700">
                      {s.icon} {s.name}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {actualToolCalls && actualToolCalls.length > 0 && (
              <Section title="实际调用的 Tools">
                <div className="space-y-2">
                  {actualToolCalls.map((tc, i) => (
                    <details key={i} className="text-xs border rounded-md">
                      <summary className="px-3 py-1.5 cursor-pointer hover:bg-muted/50 font-medium">
                        {tc.displayName || tc.toolName}
                      </summary>
                      <div className="px-3 py-2 space-y-1.5 border-t bg-muted/20">
                        <div>
                          <span className="text-muted-foreground">入参：</span>
                          <pre className="mt-0.5 whitespace-pre-wrap text-[11px] bg-muted/50 rounded p-2 max-h-32 overflow-y-auto">
                            {JSON.stringify(tc.args, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <span className="text-muted-foreground">结果：</span>
                          <pre className="mt-0.5 whitespace-pre-wrap text-[11px] bg-muted/50 rounded p-2 max-h-32 overflow-y-auto">
                            {tc.result}
                          </pre>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              </Section>
            )}

            {trace.summaryUsed && (
              <Section title="使用的对话摘要">
                <CodeBlock content={trace.summaryUsed} />
              </Section>
            )}

            {trace.ragContext && (
              <Section title="RAG 检索内容">
                <CodeBlock content={trace.ragContext} />
              </Section>
            )}

            {trace.systemPrompt && (
              <Section title="完整 System Prompt">
                <CodeBlock content={trace.systemPrompt} />
              </Section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
