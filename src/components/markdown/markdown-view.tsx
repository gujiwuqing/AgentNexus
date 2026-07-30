import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./code-block";

/**
 * 通用 Markdown 渲染器。size="sm" 用于聊天气泡等紧凑场景，
 * size="base" 用于知识库文档正文这类需要完整排版层级的场景。
 */
function MarkdownViewImpl({
  content,
  size = "sm",
  className,
}: {
  content: string;
  size?: "sm" | "base";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "prose dark:prose-invert max-w-none break-words",
        size === "sm" ? "prose-sm" : "prose-base prose-headings:scroll-mt-4",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          pre({ children }) {
            return <>{children}</>;
          },
          code({ className: codeClassName, children, ...props }) {
            const isBlock = codeClassName?.startsWith("language-") || codeClassName?.includes("hljs");
            if (isBlock) {
              return (
                <CodeBlock className={codeClassName}>
                  {String(children).replace(/\n$/, "")}
                </CodeBlock>
              );
            }
            return (
              <code className="bg-muted px-1.5 py-0.5 rounded text-sm" {...props}>
                {children}
              </code>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto">
                <table className="w-full">{children}</table>
              </div>
            );
          },
          a({ href, children, ...props }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export const MarkdownView = memo(MarkdownViewImpl);
