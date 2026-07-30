// SPDX-License-Identifier: MIT

import { ServerContext } from "../types.js";
import { guardedEmbeddingPost } from "./rate-guard.js";
import { trackUsage } from "./pricing.js";

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i]!;
    const bi = b[i]!;
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function getEmbedding(ctx: ServerContext, text: string, model = "openai/text-embedding-3-small"): Promise<number[]> {
  const response = await guardedEmbeddingPost(ctx, model, {
    model,
    input: text.slice(0, 8000),
  });
  trackUsage(ctx, model, response.data.usage);
  return response.data.data[0].embedding;
}
