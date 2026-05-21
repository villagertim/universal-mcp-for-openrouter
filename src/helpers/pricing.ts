// SPDX-License-Identifier: MIT

import { ServerContext, Usage } from "../types.js";

export async function refreshPricingCache(ctx: ServerContext) {
  try {
    const response = await ctx.axiosInstance.get("/models");
    response.data.data.forEach((m: any) => {
      ctx.pricingCache[m.id] = m.pricing;
    });
    console.error(`[Pricing] Cached ${Object.keys(ctx.pricingCache).length} models.`);
  } catch (error) {
    console.error("[Pricing] Failed to fetch pricing cache:", error);
  }
}

export function trackUsage(ctx: ServerContext, modelId: string, usage: any) {
  if (!usage) return;
  
  const pricing = ctx.pricingCache[modelId];
  let cost = 0;
  
  if (pricing) {
    const promptCost = (usage.prompt_tokens / 1_000_000) * parseFloat(pricing.prompt);
    const completionCost = (usage.completion_tokens / 1_000_000) * parseFloat(pricing.completion);
    cost = promptCost + completionCost;
  }
  
  ctx.sessionUsage.prompt_tokens += usage.prompt_tokens || 0;
  ctx.sessionUsage.completion_tokens += usage.completion_tokens || 0;
  ctx.sessionUsage.cost += cost;
}
