// SPDX-License-Identifier: MIT

import { ServerContext, OpenRouterModel, ChatRoutedArgs } from "../types.js";

// Safety headroom padding buffer: 2,000 token output buffer + 2,000 safety padding
const CONTEXT_SAFETY_BUFFER = 4000;

/**
 * Robust, dependency-free token estimator using character and word frequency statistics.
 * Provides a safe, pessimistic upper-bound (headroom) for context sizing.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const charEstimate = Math.ceil(text.length / 4);
  const wordEstimate = Math.ceil(trimmed.split(/\s+/).length * 1.33);
  return Math.max(charEstimate, wordEstimate);
}

// Built-in high-quality static fallback catalog in case disk cache loading fails or is empty
const STATIC_REGISTRY_BACKUP: OpenRouterModel[] = [
  { id: "google/gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite", context_length: 1048576, pricing: { prompt: "0.075", completion: "0.30" } },
  { id: "qwen/qwen3.7-flash", name: "Qwen3.7 Flash", context_length: 1000000, pricing: { prompt: "0.07", completion: "0.14" } },
  { id: "openai/gpt-5.4-nano", name: "GPT-5.4 Nano", context_length: 128000, pricing: { prompt: "0.075", completion: "0.30" } },
  { id: "anthropic/claude-sonnet-4.6", name: "Claude 3.5 Sonnet (v2)", context_length: 200000, pricing: { prompt: "3.00", completion: "15.00" } },
  { id: "openai/gpt-5.5", name: "GPT-5.5", context_length: 128000, pricing: { prompt: "5.00", completion: "15.00" } },
  { id: "google/gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview", context_length: 1048576, pricing: { prompt: "1.25", completion: "5.00" } }
];

// Lists of model families/IDs mapped to Frontier (Tier 1) vs. Flash (Tier 2) to support quality-aware routing
const TIER_1_FRONTIER_KEYWORDS = [
  "opus", "sonnet", "pro", "gpt-4", "gpt-5", "claude-3-5", "grok", "frontier"
];

/**
 * Evaluates whether a model has vision capabilities based on its ID or pricing catalog attributes.
 */
export function hasVisionCapability(model: OpenRouterModel): boolean {
  const modelId = model.id.toLowerCase();
  if (model.pricing?.image && parseFloat(model.pricing.image) > 0) return true;
  return (
    modelId.includes("vision") ||
    modelId.includes("claude-3-5-sonnet") ||
    modelId.includes("claude-sonnet-4.6") ||
    modelId.includes("gpt-4o") ||
    modelId.includes("gemini-1.5") ||
    modelId.includes("gemini-3.1")
  );
}

/**
 * Router Engine class containing central core intelligence for task routing.
 */
export class RouterEngine {
  /**
   * Evaluates prompt requirements and selects an ordered, failover-ready candidate list.
   */
  static selectCandidates(ctx: ServerContext, args: ChatRoutedArgs): { candidates: string[]; reason: string } {
    const {
      prompt,
      system_prompt = "",
      max_usd_price_per_1m_prompt,
      require_vision = false,
      strictness = "cost"
    } = args;

    // 1. Dynamic Token Estimation
    const promptTokens = estimateTokens(prompt) + estimateTokens(system_prompt);
    // Add output buffer and safety padding to obtain context threshold
    const targetContext = promptTokens + CONTEXT_SAFETY_BUFFER;

    // 2. Local Proxy Check (PREFER_LOCAL_MODEL Option)
    // If PREFER_LOCAL_MODEL is true, we route to the local proxy.
    // If it fails, cascade execution will proceed through cheap OpenRouter candidates.
    const candidates: string[] = [];
    let reason = "Routed based on context-size and pricing optimization.";

    if (process.env.PREFER_LOCAL_MODEL === "true") {
      const localBreaker = ctx.circuitBreakerMap?.get("openrouter-auto");
      const isLocalCircuitBroken = localBreaker ? localBreaker.open_until > Date.now() : false;
      if (!isLocalCircuitBroken) {
        candidates.push("openrouter-auto");
        reason = "Local model proxy override enabled (PREFER_LOCAL_MODEL). " + reason;
      }
    }

    // 3. Obtain Active Catalog Cache
    let activeModels = ctx.modelsCache && ctx.modelsCache.length > 0 ? ctx.modelsCache : STATIC_REGISTRY_BACKUP;

    // 4. Catalog Slicing & Filtering Loop
    const eligibleModels = activeModels.filter((model) => {
      // Filter out models with insufficient context length
      if (model.context_length < targetContext) return false;

      // Filter out non-vision models if required
      if (require_vision && !hasVisionCapability(model)) return false;

      // Filter out models exceeding user's custom price threshold
      if (max_usd_price_per_1m_prompt !== undefined) {
        const promptPrice = parseFloat(model.pricing.prompt);
        if (isNaN(promptPrice) || promptPrice > max_usd_price_per_1m_prompt) return false;
      }

      // Filter out models currently inside an open circuit breaker window
      if (ctx.circuitBreakerMap) {
        const breaker = ctx.circuitBreakerMap.get(model.id);
        if (breaker && breaker.open_until > Date.now()) return false;
      }

      return true;
    });

    if (eligibleModels.length === 0) {
      if (candidates.length > 0) {
        // Return only the local proxy candidate
        return { candidates, reason: "No matching OpenRouter models. Routed only to local proxy." };
      }
      return { candidates: [], reason: `No matching models found in cache for target context of ${targetContext} tokens.` };
    }

    // 5. Ranking & Sorting
    if (strictness === "cost") {
      // Sort strictly by cheapest prompt price per 1M tokens ascending
      eligibleModels.sort((a, b) => parseFloat(a.pricing.prompt) - parseFloat(b.pricing.prompt));
    } else {
      // Quality Strictness sorting: Group into Tier 1 (Frontier) and Tier 2 (Flash)
      const tier1: OpenRouterModel[] = [];
      const tier2: OpenRouterModel[] = [];

      eligibleModels.forEach((m) => {
        const isTier1 = TIER_1_FRONTIER_KEYWORDS.some(
          (kw) => m.id.toLowerCase().includes(kw) || m.name.toLowerCase().includes(kw)
        );
        if (isTier1) {
          tier1.push(m);
        } else {
          tier2.push(m);
        }
      });

      // Sort models in each tier by cheapest cost ascending
      tier1.sort((a, b) => parseFloat(a.pricing.prompt) - parseFloat(b.pricing.prompt));
      tier2.sort((a, b) => parseFloat(a.pricing.prompt) - parseFloat(b.pricing.prompt));

      // Re-assemble ranking: Tier 1 models first, followed by Tier 2 models
      eligibleModels.length = 0;
      eligibleModels.push(...tier1, ...tier2);
    }

    // Append top candidates up to 5 models for optimal execution failovers
    const topEligible = eligibleModels.slice(0, 5).map((m) => m.id);
    candidates.push(...topEligible);

    // Filter out duplicates (in case local proxy ID was added)
    const uniqueCandidates = Array.from(new Set(candidates));

    return { candidates: uniqueCandidates, reason };
  }
}
