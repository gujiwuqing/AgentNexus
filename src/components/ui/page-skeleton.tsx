import { Skeleton } from "@/components/ui/skeleton";

/**
 * 详情/设置类页面的加载占位。列表页已有各自的卡片骨架，
 * 这里补齐此前用裸文字「加载中」的页面，避免内容就绪时的整页跳动。
 */
export function PageFormSkeleton({ className }: { className?: string }) {
  return (
    <div className={`w-full max-w-7xl mx-auto px-6 py-8 lg:px-10 ${className ?? ""}`}>
      <Skeleton className="h-8 w-48" />
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}

/** 聊天区加载占位：交替左右的气泡骨架。 */
export function ChatSkeleton() {
  return (
    <div className="flex-1 overflow-hidden p-4">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`flex gap-2 ${i % 2 === 0 ? "flex-row-reverse" : "flex-row"}`}>
            <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
            <Skeleton className={`h-16 ${i % 2 === 0 ? "w-1/2" : "w-2/3"}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
