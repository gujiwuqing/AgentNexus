import { readStoredFile } from "@/lib/files/storage";
import { extractText } from "@/lib/files/extractor";
import { embedTexts } from "@/lib/ai/embedding";
import { chunkText } from "./chunker";
import { getKnowledgeDocument, updateDocumentStatus } from "@/server/knowledge-documents";
import { deleteChunksByDocument, insertChunks } from "@/server/knowledge-chunks";
import { getKnowledgeBase } from "@/server/knowledge-bases";
import { getProviderConfig } from "@/server/provider-config";

export async function indexDocument(documentId: string): Promise<void> {
  const doc = await getKnowledgeDocument(documentId);
  if (!doc) throw new Error("Document not found");

  const kb = await getKnowledgeBase(doc.knowledgeBaseId);
  if (!kb) throw new Error("Knowledge base not found");

  const globalConfig = await getProviderConfig();
  if (!globalConfig) throw new Error("AI provider not configured");

  const embeddingModel = kb.embeddingModel || globalConfig.embeddingModel;
  if (!embeddingModel) throw new Error("No embedding model configured");

  try {
    await updateDocumentStatus(documentId, "processing");
    await deleteChunksByDocument(documentId);

    const buffer = await readStoredFile(doc.storagePath);
    const text = await extractText(buffer, doc.mimetype);

    if (!text.trim()) {
      await updateDocumentStatus(documentId, "completed", 0);
      return;
    }

    const chunks = chunkText(text, kb.chunkSize, kb.chunkOverlap);

    const batchSize = 100;
    const allEmbeddings: number[][] = [];
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const embeddings = await embedTexts(
        globalConfig.baseUrl,
        globalConfig.apiKey,
        embeddingModel,
        batch,
      );
      allEmbeddings.push(...embeddings);
    }

    await insertChunks(
      documentId,
      chunks.map((content, i) => ({
        content,
        embedding: allEmbeddings[i],
        chunkIndex: i,
      })),
    );

    await updateDocumentStatus(documentId, "completed", chunks.length);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Indexing failed";
    await updateDocumentStatus(documentId, "failed", undefined, message);
    throw err;
  }
}
