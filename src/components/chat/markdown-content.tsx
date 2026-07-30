import { MarkdownView } from "@/components/markdown/markdown-view";

/** 聊天气泡中的 Markdown 渲染，复用通用渲染器的紧凑尺寸。 */
export function MarkdownContent({ content }: { content: string }) {
  return <MarkdownView content={content} size="sm" />;
}
