"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { processDataStream } from "ai";
import type { Message } from "@/types/message";
import { useConversationDetail } from "./use-conversations";
import { useProviderConfig } from "./use-provider-config";
import { useQueryClient } from "@tanstack/react-query";

export type MessageMeta = {
  model: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  durationMs: number | null;
};

export type DisplayMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "error";
  content: string;
  createdAt: string;
  meta?: MessageMeta;
  toolCalls?: Array<{ toolName: string; displayName: string; args: Record<string, unknown>; result: string }>;
};

function toMeta(m: Message): MessageMeta {
  return {
    model: m.model,
    promptTokens: m.promptTokens,
    completionTokens: m.completionTokens,
    totalTokens: m.totalTokens,
    durationMs: m.durationMs,
  };
}

export function useChatStream(conversationId: string, agentModel: string | null) {
  const { data, isLoading } = useConversationDetail(conversationId);
  const { data: globalConfig } = useProviderConfig();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const effectiveModel =
    agentModel && agentModel.trim() !== "" ? agentModel : globalConfig?.model ?? null;

  useEffect(() => {
    if (data) {
      setMessages(
        data.messages.map((m: Message) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
          meta: toMeta(m),
          toolCalls: m.toolCalls ?? undefined,
        }))
      );
    }
  }, [data]);

  const persistPartial = useCallback(
    async (convId: string, text: string, durationMs: number) => {
      const trimmed = text.trim();
      if (!trimmed) return null;
      const res = await fetch(`/api/conversations/${convId}/messages/assistant`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: trimmed, model: effectiveModel, durationMs }),
      });
      if (!res.ok) return null;
      return res.json();
    },
    [effectiveModel]
  );

  const streamReply = useCallback(
    async (content: string, replaceLastAssistant = false, attachmentIds?: string[]) => {
      const assistantId = `local-${Date.now()}-assistant`;
      const now = new Date().toISOString();
      if (replaceLastAssistant) {
        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: "assistant", content: "", createdAt: now },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: `local-${Date.now()}-user`, role: "user", content, createdAt: now },
          { id: assistantId, role: "assistant", content: "", createdAt: now },
        ]);
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);
      const startedAt = performance.now();

      let text = "";
      let usage: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | undefined;
      let aborted = false;

      try {
        const res = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ content, ...(attachmentIds?.length ? { attachmentIds } : {}) }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
        }

        const setAssistant = (snapshot: string) =>
          setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: snapshot } : m)));

        try {
          await processDataStream({
            stream: res.body,
            onTextPart: (delta: string) => {
              text += delta;
              setAssistant(text);
            },
            onFinishMessagePart: (part: { usage?: typeof usage }) => {
              usage = part?.usage;
            },
          });
        } catch (streamErr) {
          // data-stream 解析失败时降级:把原始字节当纯文本累加,避免崩溃
          if (text === "" && res.body) {
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              text += decoder.decode(value, { stream: true });
              setAssistant(text);
            }
          }
          if (!(streamErr instanceof Error && streamErr.name === "AbortError")) {
            throw streamErr;
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          aborted = true;
        } else {
          setMessages((prev) => [
            ...prev.filter((m) => m.id !== assistantId),
            {
              id: `local-${Date.now()}-error`,
              role: "error",
              content: err instanceof Error ? err.message : "Something went wrong",
              createdAt: new Date().toISOString(),
            },
          ]);
          setIsStreaming(false);
          abortRef.current = null;
          queryClient.invalidateQueries({ queryKey: ["conversations", conversationId] });
          return;
        }
      }

      const durationMs = Math.round(performance.now() - startedAt);

      if (aborted) {
        // 保留半截:落库 + 更新气泡 meta(model+duration,无 tokens)
        if (text.trim()) {
          await persistPartial(conversationId, text, durationMs);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    meta: {
                      model: effectiveModel,
                      promptTokens: null,
                      completionTokens: null,
                      totalTokens: null,
                      durationMs,
                    },
                  }
                : m
            )
          );
        } else {
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        }
      } else {
        // 正常结束:后端已落库;前端用收到的 usage + 前端 duration 立即渲染脚注
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  meta: {
                    model: effectiveModel,
                    promptTokens: usage?.promptTokens ?? null,
                    completionTokens: usage?.completionTokens ?? null,
                    totalTokens: usage?.totalTokens ?? null,
                    durationMs,
                  },
                }
              : m
          )
        );
      }

      setIsStreaming(false);
      abortRef.current = null;
      queryClient.invalidateQueries({ queryKey: ["conversations", conversationId] });
    },
    [conversationId, queryClient, effectiveModel, persistPartial]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  async function sendMessage(content: string, attachmentIds?: string[]) {
    await streamReply(content, false, attachmentIds);
  }

  async function regenerate() {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastAssistant || !lastUser) return;

    if (!lastAssistant.id.startsWith("local-")) {
      await fetch(`/api/messages/${lastAssistant.id}`, { method: "DELETE" });
    }

    setMessages((prev) => prev.filter((m) => m.id !== lastAssistant.id));
    await streamReply(lastUser.content, true);
  }

  async function deleteMsg(id: string) {
    await fetch(`/api/messages/${id}`, { method: "DELETE" });
    setMessages((prev) => prev.filter((m) => m.id !== id));
    queryClient.invalidateQueries({ queryKey: ["conversations", conversationId] });
  }

  return { messages, isLoading, isStreaming, sendMessage, regenerate, deleteMessage: deleteMsg, stop };
}
