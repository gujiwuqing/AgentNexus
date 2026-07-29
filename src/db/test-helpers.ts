import { db } from "./index";
import {
  agents,
  conversations,
  messages,
  aiProviderConfig,
  workflowStepLogs,
  workflowRuns,
  workflows,
} from "./schema";

export async function clearAllTables() {
  await db.delete(messages);
  await db.delete(conversations);
  await db.delete(workflowStepLogs);
  await db.delete(workflowRuns);
  await db.delete(workflows);
  await db.delete(agents);
  await db.delete(aiProviderConfig);
}
