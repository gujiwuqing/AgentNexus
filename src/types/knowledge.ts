export type KnowledgeBase = {
  id: string;
  name: string;
  description: string;
  embeddingModel: string | null;
  chunkSize: number;
  chunkOverlap: number;
  createdAt: string;
  updatedAt: string;
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
