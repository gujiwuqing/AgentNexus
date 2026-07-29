import { createOpenAI } from "@ai-sdk/openai";
import { embedMany, embed } from "ai";

export async function embedTexts(
  baseUrl: string,
  apiKey: string,
  embeddingModel: string,
  texts: string[],
): Promise<number[][]> {
  const openai = createOpenAI({ baseURL: baseUrl, apiKey });
  const { embeddings } = await embedMany({
    model: openai.embedding(embeddingModel),
    values: texts,
  });
  return embeddings;
}

export async function embedSingle(
  baseUrl: string,
  apiKey: string,
  embeddingModel: string,
  text: string,
): Promise<number[]> {
  const openai = createOpenAI({ baseURL: baseUrl, apiKey });
  const { embedding } = await embed({
    model: openai.embedding(embeddingModel),
    value: text,
  });
  return embedding;
}
