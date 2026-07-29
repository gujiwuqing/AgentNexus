import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

export function AgentAvatar({
  avatar,
  className,
  iconClassName,
}: {
  avatar?: string | null;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div
      className={cn(
        "h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-base shrink-0 overflow-hidden select-none",
        className
      )}
    >
      {avatar ? <span>{avatar}</span> : <Bot className={cn("h-4 w-4 text-brand", iconClassName)} />}
    </div>
  );
}
