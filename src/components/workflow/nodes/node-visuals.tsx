import type { LucideIcon } from "lucide-react";
import { Bot, GitBranch, Wrench, User, Globe, Terminal, Timer, GitMerge } from "lucide-react";

export type NodeVisualType =
  | "agent"
  | "condition"
  | "transform"
  | "human_input"
  | "http_request"
  | "code_execute"
  | "delay"
  | "variable_aggregate";

type NodeVisual = {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  barClass: string;
};

export const NODE_VISUALS: Record<NodeVisualType, NodeVisual> = {
  agent: {
    icon: Bot,
    iconBg: "bg-brand/15",
    iconColor: "text-brand",
    barClass: "bg-brand",
  },
  condition: {
    icon: GitBranch,
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-600 dark:text-amber-400",
    barClass: "bg-amber-500",
  },
  transform: {
    icon: Wrench,
    iconBg: "bg-teal-500/15",
    iconColor: "text-teal-600 dark:text-teal-400",
    barClass: "bg-teal-500",
  },
  human_input: {
    icon: User,
    iconBg: "bg-pink-500/15",
    iconColor: "text-pink-600 dark:text-pink-400",
    barClass: "bg-pink-500",
  },
  http_request: {
    icon: Globe,
    iconBg: "bg-sky-500/15",
    iconColor: "text-sky-600 dark:text-sky-400",
    barClass: "bg-sky-500",
  },
  code_execute: {
    icon: Terminal,
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-600 dark:text-violet-400",
    barClass: "bg-violet-500",
  },
  delay: {
    icon: Timer,
    iconBg: "bg-slate-500/15",
    iconColor: "text-slate-600 dark:text-slate-400",
    barClass: "bg-slate-500",
  },
  variable_aggregate: {
    icon: GitMerge,
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    barClass: "bg-emerald-500",
  },
};
