import { NODE_VISUALS, type NodeVisualType } from "./node-visuals";

export function NodeShell({
  type,
  label,
  subtitle,
  runStatus,
  children,
}: {
  type: NodeVisualType;
  label: string;
  subtitle: string;
  runStatus?: string;
  children?: React.ReactNode;
}) {
  const visual = NODE_VISUALS[type];
  const Icon = visual.icon;
  const statusBorder =
    runStatus === "completed"
      ? "border-emerald-500"
      : runStatus === "failed"
        ? "border-red-500"
        : runStatus === "paused"
          ? "border-blue-500"
          : runStatus === "running" || runStatus === "waiting_for_input"
            ? "border-amber-500"
            : "border-border";
  const isActive = runStatus === "running" || runStatus === "waiting_for_input";

  return (
    <div
      className={`relative bg-card border-2 ${statusBorder} ${isActive ? "animate-pulse" : ""} rounded-lg pl-4 pr-3 py-2 min-w-[150px] shadow-sm`}
    >
      <div className={`absolute left-1.5 top-2 bottom-2 w-1 rounded-full ${visual.barClass}`} />
      <div className="flex items-center gap-2 mb-1">
        <div className={`h-5 w-5 rounded-md flex items-center justify-center shrink-0 ${visual.iconBg}`}>
          <Icon className={`h-3 w-3 ${visual.iconColor}`} />
        </div>
        <span className="text-xs font-semibold truncate">{label}</span>
      </div>
      <p className="text-[10px] text-muted-foreground truncate pl-7">{subtitle}</p>
      {children}
    </div>
  );
}
