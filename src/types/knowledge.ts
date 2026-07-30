export type KnowledgeBaseStats = {
  documentCount: number;
  chunkCount: number;
  failedCount: number;
  indexingCount: number;
};

export type KnowledgeBase = {
  id: string;
  name: string;
  description: string;
  embeddingModel: string | null;
  chunkSize: number;
  chunkOverlap: number;
  createdAt: string;
  updatedAt: string;
  /** 仅列表接口返回 */
  stats?: KnowledgeBaseStats;
};

export type KnowledgeDocument = {
  id: string;
  knowledgeBaseId: string;
  filename: string;
  mimetype: string;
  size: number;
  status: "pending" | "processing" | "completed" | "failed";
  chunkCount: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};
