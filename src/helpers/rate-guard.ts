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

export async function guardedCompletionPost(ctx: ServerContext, model: string, data: any): Promise<any> {
  const budget = checkBudget(ctx);
  if (!budget.allowed) throw new Error(budget.message);

  const cb = checkCircuitBreaker(ctx, model);
  if (!cb.allowed) throw new Error(cb.message);

  const tb = checkTokenBucket(ctx, model);
  if (!tb.allowed) throw new Error(tb.message);

  try {
    const response = await ctx.axiosInstance.post("/chat/completions", data);
    recordSuccess(ctx, model);
    return response;
  } catch (error) {
    recordFailure(ctx, model);
    throw error;
  }
}

export async function guardedEmbeddingPost(ctx: ServerContext, model: string, data: any): Promise<any> {
  const budget = checkBudget(ctx);
  if (!budget.allowed) throw new Error(budget.message);

  const tb = checkTokenBucket(ctx, model);
  if (!tb.allowed) throw new Error(tb.message);

  return await ctx.axiosInstance.post("/embeddings", data);
}
