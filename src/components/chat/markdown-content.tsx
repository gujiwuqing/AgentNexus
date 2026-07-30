import { MarkdownView } from "@/components/markdown/markdown-view";

/** 聊天气泡中的 Markdown 渲染，复用通用渲染器的紧凑尺寸。
 *  onPrimary：气泡背景为品牌色（用户消息）时启用反色 prose 配色。 */
export function MarkdownContent({ content, onPrimary }: { content: string; onPrimary?: boolean }) {
  return <MarkdownView content={content} size="sm" className={onPrimary ? "prose-on-primary" : undefined} />;
}
