import { readStoredFile } from "@/lib/files/storage";
import { extractText, extractPdfPages } from "@/lib/files/extractor";
import { detectFileKind } from "@/lib/files/file-kind";
import { embedTexts } from "@/lib/ai/embedding";
import { chunkText } from "./chunker";
import { chunkMarkdown } from "./markdown-chunker";
import { chunkPdfPages } from "./pdf-chunker";
import { getKnowledgeDocument, updateDocumentStatus } from "@/server/knowledge-documents";
import { deleteChunksByDocument, insertChunks } from "@/server/knowledge-chunks";
import { getKnowledgeBase } from "@/server/knowledge-bases";
import { getProviderConfig } from "@/server/provider-config";

type IndexedChunk = { content: string; heading?: string; page?: number };

export async function indexDocument(documentId: string): Promise<void> {
  const doc = await getKnowledgeDocument(documentId);
  if (!doc) throw new Error("Document not found");

  const kb = await getKnowledgeBase(doc.knowledgeBaseId);
  if (!kb) throw new Error("Knowledge base not found");

  const globalConfig = await getProviderConfig(kb.userId);
  if (!globalConfig) throw new Error("AI provider not configured");

  const embeddingModel = kb.embeddingModel || globalConfig.embeddingModel;
  if (!embeddingModel) throw new Error("No embedding model configured");

  try {
    await updateDocumentStatus(documentId, "processing");
    await deleteChunksByDocument(documentId);

    const buffer = await readStoredFile(doc.storagePath);
    const kind = detectFileKind(doc.filename, doc.mimetype);

    // 按文件类型选分片策略：Markdown 走结构感知，PDF 保留页码，其余按字符切分。
    let chunks: IndexedChunk[];
    if (kind === "pdf") {
      const pages = await extractPdfPages(buffer);
      if (!pages.some((p) => p.text.trim())) {
        await updateDocumentStatus(documentId, "completed", 0);
        return;
      }
      chunks = chunkPdfPages(pages, kb.chunkSize, kb.chunkOverlap);
    } else {
      const text = await extractText(buffer, doc.mimetype, doc.filename);
      if (!text.trim()) {
        await updateDocumentStatus(documentId, "completed", 0);
        return;
      }
      chunks =
        kind === "markdown"
          ? chunkMarkdown(text, kb.chunkSize, kb.chunkOverlap)
          : chunkText(text, kb.chunkSize, kb.chunkOverlap).map((content) => ({ content }));
    }

    const batchSize = 100;
    const allEmbeddings: number[][] = [];
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const embeddings = await embedTexts(
        globalConfig.baseUrl,
        globalConfig.apiKey,
        embeddingModel,
        batch.map((c) => c.content),
      );
      allEmbeddings.push(...embeddings);
    }

    await insertChunks(
      documentId,
      chunks.map((chunk, i) => {
        const metadata: Record<string, unknown> = {};
        if (chunk.heading) metadata.heading = chunk.heading;
        if (chunk.page != null) metadata.page = chunk.page;
        return {
          content: chunk.content,
          embedding: allEmbeddings[i],
          chunkIndex: i,
          metadata,
        };
      }),
    );

    await updateDocumentStatus(documentId, "completed", chunks.length);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Indexing failed";
    await updateDocumentStatus(documentId, "failed", undefined, message);
    throw err;
  }
}
