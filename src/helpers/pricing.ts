// SPDX-License-Identifier: MIT

import fs from "fs/promises";
import { PRICING_CACHE_PATH } from "../config.js";
import { ServerContext, Usage, OpenRouterModel } from "../types.js";

export async function loadPricingCacheFromDisk(ctx: ServerContext): Promise<boolean> {
  try {
    const content = await fs.readFile(PRICING_CACHE_PATH, "utf-8");
    const models: OpenRouterModel[] = JSON.parse(content);
    if (Array.isArray(models) && models.length > 0) {
      ctx.modelsCache = models;
      models.forEach((m) => {
        ctx.pricingCache[m.id] = m.pricing;
      });
      console.error(`[Pricing] Loaded ${models.length} models from disk cache.`);
      return true;
    }
    return false;
  } catch (error: any) {
    if (error.code !== "ENOENT") {
      console.error("[Pricing] Failed to load pricing cache from disk:", error.message);
    }
    return false;
  }
}

export async function savePricingCacheToDisk(ctx: ServerContext): Promise<void> {
  try {
    if (ctx.modelsCache && ctx.modelsCache.length > 0) {
      await fs.writeFile(PRICING_CACHE_PATH, JSON.stringify(ctx.modelsCache, null, 2), "utf-8");
      console.error(`[Pricing] Saved ${ctx.modelsCache.length} models to disk cache.`);
    }
  } catch (error: any) {
    console.error("[Pricing] Failed to save pricing cache to disk:", error.message);
  }
}

export async function refreshPricingCache(ctx: ServerContext) {
  try {
    const response = await ctx.axiosInstance.get("/models");
    const models: OpenRouterModel[] = response.data.data.map((m: any) => ({
      id: m.id,
      name: m.name,
      context_length: Number(m.context_length),
      pricing: m.pricing,
    }));
    
    ctx.modelsCache = models;
    models.forEach((m) => {
      ctx.pricingCache[m.id] = m.pricing;
    });
    
    console.error(`[Pricing] Cached ${models.length} models from remote.`);
    savePricingCacheToDisk(ctx).catch(() => {});
  } catch (error: any) {
    console.error("[Pricing] Failed to fetch remote pricing cache:", error.message);
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
