import { z } from "zod";
import type { ToolDefinition } from "./types";

export const currentTimeTool: ToolDefinition = {
  name: "current_time",
  displayName: "Current Time",
  description: "Get the current date and time. Optionally specify a timezone.",
  parameters: z.object({
    timezone: z.string().optional().describe("IANA timezone, e.g. Asia/Shanghai, America/New_York"),
  }),
  execute: async (params) => {
    const tz = (params.timezone as string) || "Asia/Shanghai";
    try {
      return new Date().toLocaleString("zh-CN", { timeZone: tz, dateStyle: "full", timeStyle: "long" });
    } catch {
      return new Date().toLocaleString("zh-CN", { dateStyle: "full", timeStyle: "long" });
    }
  },
};
