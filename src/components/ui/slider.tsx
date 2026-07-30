import { cn } from "@/lib/utils";

/** 原生 range 滑杆（accent-color 走主题色），零依赖、键盘可操作。 */
export function Slider({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="range"
      className={cn("h-2 w-full cursor-pointer accent-primary", className)}
      {...props}
    />
  );
}
