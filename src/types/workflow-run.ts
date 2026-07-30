export type WorkflowRun = {
  id: string;
  workflowId: string;
  status: "running" | "waiting_for_input" | "completed" | "failed" | "paused";
  input: string;
  currentNodeId: string | null;
  context: Record<string, string>;
  error: string | null;
  versionNumber: number | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowStepLog = {
  id: string;
  runId: string;
  nodeId: string;
  nodeType: string;
  input: string;
  output: string | null;
  status: "running" | "completed" | "failed" | "skipped";
  startedAt: string;
  completedAt: string | null;
};

export type WorkflowRunDetail = {
  run: WorkflowRun;
  stepLogs: WorkflowStepLog[];
};
