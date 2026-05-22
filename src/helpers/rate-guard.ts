// SPDX-License-Identifier: MIT

import { ServerContext } from "../types.js";

export function checkBudget(ctx: ServerContext): { allowed: boolean; message?: string } {
  const spent = ctx.sessionUsage.cost;
  const max = ctx.rateLimiterConfig.max_dollars;
  if (spent >= max) {
    return {
      allowed: false,
      message: `💰 Budget cap reached: $${spent.toFixed(4)} of $${max.toFixed(2)} spent this session. Use set_budget to raise the limit or get_budget_status to review.`,
    };
  }
  const pct = (spent / max) * 100;
  if (pct >= ctx.rateLimiterConfig.warn_at_percent) {
    console.error(`[RateGuard] ⚠️  Budget warning: ${pct.toFixed(1)}% used ($${spent.toFixed(4)} / $${max.toFixed(2)})`);
  }
  return { allowed: true };
}

export function checkCircuitBreaker(ctx: ServerContext, model: string): { allowed: boolean; message?: string } {
  const cb = ctx.circuitBreakerMap.get(model);
  if (cb && cb.open_until > Date.now()) {
    const remaining = Math.ceil((cb.open_until - Date.now()) / 1000);
    return {
      allowed: false,
      message: `⚡ Circuit breaker open for "${model}": ${cb.failures} consecutive failures. Retrying in ${remaining}s. Try a different model or preset.`,
    };
  }
  return { allowed: true };
}

export function checkTokenBucket(ctx: ServerContext, model: string): { allowed: boolean; message?: string } {
  const now = Date.now();
  const max = ctx.rateLimiterConfig.max_requests_per_minute;
  let bucket = ctx.tokenBucketMap.get(model) ?? { tokens: max, last_refill: now };
  
  const elapsed = now - bucket.last_refill;
  const refill = (elapsed / 60_000) * max;
  bucket = {
    tokens: Math.min(max, bucket.tokens + refill),
    last_refill: now,
  };
  
  if (bucket.tokens < 1) {
    ctx.tokenBucketMap.set(model, bucket);
    const wait = Math.ceil((1 - bucket.tokens) / max * 60);
    return { allowed: false, message: `🚦 Rate limit hit for "${model}": max ${max} req/min. Try again in ~${wait}s.` };
  }
  
  bucket.tokens -= 1;
  ctx.tokenBucketMap.set(model, bucket);
  return { allowed: true };
}

export function recordSuccess(ctx: ServerContext, model: string): void {
  const cb = ctx.circuitBreakerMap.get(model);
  if (cb && cb.failures > 0) {
    ctx.circuitBreakerMap.set(model, { failures: 0, open_until: 0 });
  }
}

export function recordFailure(ctx: ServerContext, model: string): void {
  const cb = ctx.circuitBreakerMap.get(model) ?? { failures: 0, open_until: 0 };
  const failures = cb.failures + 1;
  const open_until = failures >= 3 ? Date.now() + 60_000 : 0;
  ctx.circuitBreakerMap.set(model, { failures, open_until });
  if (open_until > 0) {
    console.error(`[RateGuard] 🔴 Circuit breaker OPEN for "${model}" after ${failures} failures. Cooldown: 60s.`);
  }
}

export function redactSecrets(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    let redacted = obj;
    // Regex for OpenRouter Key
    redacted = redacted.replace(/sk-or-v1-[a-zA-Z0-9]{32,128}/gi, "[REDACTED]");
    // Regex for OpenAI API Key
    redacted = redacted.replace(/sk-proj-[a-zA-Z0-9_-]{32,128}/gi, "[REDACTED]");
    // Regex for SSH / Private key blocks
    redacted = redacted.replace(/-----BEGIN\s+[A-Z0-9\s_-]+KEY-----[\s\S]+?-----END\s+[A-Z0-9\s_-]+KEY-----/gi, "[REDACTED]");
    return redacted;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => redactSecrets(item));
  }
  if (typeof obj === "object") {
    const copy: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        copy[key] = redactSecrets(obj[key]);
      }
    }
    return copy;
  }
  return obj;
}

export function getDynamicBackups(ctx: ServerContext, primaryModel: string, needsVision?: boolean): string[] {
  const fallbacks: string[] = [];
  const isCandidate = (m: string) => m !== primaryModel;
  const multiplier = ctx.rateLimiterConfig.fallback_price_multiplier ?? 1.5;

  // 1. Try resolving using models cache
  if (ctx.modelsCache && ctx.modelsCache.length > 0) {
    const primary = ctx.modelsCache.find(m => m.id === primaryModel);
    if (primary) {
      const primaryPromptPrice = parseFloat(primary.pricing.prompt || "0");
      const primaryContext = primary.context_length || 4096;

      const candidates = ctx.modelsCache.filter(m => {
        if (m.id === primaryModel) return false;
        if (m.context_length < primaryContext) return false;

        if (needsVision) {
          const hasVision = (m.pricing.image && parseFloat(m.pricing.image) > 0) || 
                            m.name.toLowerCase().includes("vision") || 
                            m.id.toLowerCase().includes("vision");
          if (!hasVision) return false;
        }

        const price = parseFloat(m.pricing.prompt || "0");
        if (price > primaryPromptPrice * multiplier) return false;

        return true;
      });

      // Sort by price (cheapest first), then context length (largest first)
      candidates.sort((a, b) => {
        const priceA = parseFloat(a.pricing.prompt || "0");
        const priceB = parseFloat(b.pricing.prompt || "0");
        if (priceA !== priceB) return priceA - priceB;
        return b.context_length - a.context_length;
      });

      for (const cand of candidates) {
        if (isCandidate(cand.id)) {
          fallbacks.push(cand.id);
        }
      }
    }
  }

  // 2. Fallback to high-quality static tiers if unpopulated or unrecognized
  if (fallbacks.length === 0) {
    const modelLower = primaryModel.toLowerCase();
    const isPremium = modelLower.includes("opus") ||
                      modelLower.includes("sonnet-4") ||
                      modelLower.includes("claude-3-5-sonnet") ||
                      modelLower.includes("gpt-4") ||
                      modelLower.includes("gpt-5") ||
                      modelLower.includes("gemini-1.5-pro") ||
                      modelLower.includes("gemini-3.1-pro") ||
                      modelLower.includes("grok-4");

    if (isPremium) {
      const premiumStatic = [
        "anthropic/claude-3.5-sonnet",
        "google/gemini-1.5-pro",
        "openai/gpt-4o",
        "anthropic/claude-3-5-haiku"
      ];
      for (const m of premiumStatic) {
        if (isCandidate(m)) fallbacks.push(m);
      }
    } else {
      const cheapStatic = [
        "google/gemini-1.5-flash",
        "openai/gpt-4o-mini",
        "anthropic/claude-3-5-haiku",
        "meta-llama/llama-3.1-8b-instruct",
        "qwen/qwen-2.5-72b-instruct"
      ];
      for (const m of cheapStatic) {
        if (isCandidate(m)) fallbacks.push(m);
      }
    }
  }

  return fallbacks.slice(0, 3);
}

export async function guardedCompletionPost(ctx: ServerContext, model: string, data: any): Promise<any> {
  const budget = checkBudget(ctx);
  if (!budget.allowed) throw new Error(budget.message);

  const disableFailover = process.env.DISABLE_FAILOVER === "true" || ctx.rateLimiterConfig.disable_failover === true;

  // Resolve failover attempts sequence
  let attempts: string[] = [model];
  if (!disableFailover) {
    let fallbacks: string[] = [];
    if (data.models && Array.isArray(data.models)) {
      fallbacks = data.models.filter((m: any) => typeof m === "string");
    } else {
      const needsVision = data.messages && JSON.stringify(data.messages).includes("image_url");
      fallbacks = getDynamicBackups(ctx, model, needsVision);
    }
    
    // De-duplicate, preserve order, and exclude primary model from fallback slots to prevent cycle loops
    const uniqueFallbacks = Array.from(new Set(fallbacks)).filter(m => m !== model);
    attempts = [model, ...uniqueFallbacks];
  }

  const errors: Array<{ model: string; error: string }> = [];

  for (let i = 0; i < attempts.length; i++) {
    const currentModel = attempts[i];
    const isPrimary = i === 0;

    if (!isPrimary) {
      console.error(`[Failover] 🔄 Primary model "${model}" failed. Attempting fallback: "${currentModel}"...`);
    }

    // Check circuit breaker locally
    const cb = checkCircuitBreaker(ctx, currentModel);
    if (!cb.allowed) {
      errors.push({ model: currentModel, error: cb.message || "Circuit breaker open" });
      console.error(`[Failover] Skipping model "${currentModel}": Circuit breaker is open.`);
      continue;
    }

    // Check token bucket rate limit locally
    const tb = checkTokenBucket(ctx, currentModel);
    if (!tb.allowed) {
      errors.push({ model: currentModel, error: tb.message || "Rate limit reached" });
      console.error(`[Failover] Skipping model "${currentModel}": Token bucket rate limit hit.`);
      continue;
    }

    // Reconstruct data payload for this specific model attempt
    const attemptData = { ...data };
    attemptData.model = currentModel;
    if (attemptData.models) {
      delete attemptData.models;
    }

    const finalData = process.env.DISABLE_REDACTION === "true" ? attemptData : redactSecrets(attemptData);

    try {
      const response = await ctx.axiosInstance.post("/chat/completions", finalData);
      recordSuccess(ctx, currentModel);
      
      if (!isPrimary) {
        console.error(`[Failover] ⚡ Primary model "${model}" failed. Transparently rerouted and completed via "${currentModel}".`);
      }
      return response;
    } catch (error: any) {
      recordFailure(ctx, currentModel);
      const errMsg = error.response?.data?.error?.message || error.message;
      errors.push({ model: currentModel, error: errMsg });
      console.error(`[Failover] ⚠️ Model "${currentModel}" failed: ${errMsg}`);
    }
  }

  const summary = errors.map(e => `[${e.model}]: ${e.error}`).join("; ");
  throw new Error(`All completion attempts exhausted. Details: ${summary}`);
}

export async function guardedEmbeddingPost(ctx: ServerContext, model: string, data: any): Promise<any> {
  const budget = checkBudget(ctx);
  if (!budget.allowed) throw new Error(budget.message);

  const tb = checkTokenBucket(ctx, model);
  if (!tb.allowed) throw new Error(tb.message);

  const finalData = process.env.DISABLE_REDACTION === "true" ? data : redactSecrets(data);

  return await ctx.axiosInstance.post("/embeddings", finalData);
}
