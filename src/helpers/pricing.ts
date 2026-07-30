// SPDX-License-Identifier: MIT

import fs from "fs/promises";
import { PRICING_CACHE_PATH } from "../config.js";
import { ServerContext, Usage, OpenRouterModel } from "../types.js";

export const PRICING_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface PricingCacheFile {
  last_updated: number;
  models: OpenRouterModel[];
}

export async function loadPricingCacheFromDisk(ctx: ServerContext): Promise<{ loaded: boolean; isFresh: boolean }> {
  try {
    const content = await fs.readFile(PRICING_CACHE_PATH, "utf-8");
    const parsed = JSON.parse(content);
    
    let models: OpenRouterModel[] = [];
    let lastUpdated = 0;

    if (Array.isArray(parsed)) {
      // Legacy cache array format
      models = parsed;
    } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.models)) {
      models = parsed.models;
      lastUpdated = Number(parsed.last_updated) || 0;
    }

    if (models.length > 0) {
      ctx.modelsCache = models;
      models.forEach((m) => {
        ctx.pricingCache[m.id] = m.pricing;
      });

      const ageMs = Date.now() - lastUpdated;
      const isFresh = lastUpdated > 0 && ageMs < PRICING_CACHE_TTL_MS;

      console.error(`[Pricing] Loaded ${models.length} models from disk cache (${isFresh ? "fresh" : "stale"}).`);
      return { loaded: true, isFresh };
    }
    return { loaded: false, isFresh: false };
  } catch (error: any) {
    if (error.code !== "ENOENT") {
      console.error("[Pricing] Failed to load pricing cache from disk:", error.message);
    }
    return { loaded: false, isFresh: false };
  }
}

export async function savePricingCacheToDisk(ctx: ServerContext): Promise<void> {
  try {
    if (ctx.modelsCache && ctx.modelsCache.length > 0) {
      const cacheData: PricingCacheFile = {
        last_updated: Date.now(),
        models: ctx.modelsCache,
      };
      await fs.writeFile(PRICING_CACHE_PATH, JSON.stringify(cacheData, null, 2), "utf-8");
      console.error(`[Pricing] Saved ${ctx.modelsCache.length} models to disk cache.`);
    }
  } catch (error: any) {
    console.error("[Pricing] Failed to save pricing cache to disk:", error.message);
  }
}

export async function refreshPricingCache(ctx: ServerContext, options?: { force?: boolean; isFresh?: boolean }) {
  if (!options?.force && options?.isFresh) {
    console.error("[Pricing] Disk cache is fresh (< 24h old). Skipping remote refresh.");
    return;
  }

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
