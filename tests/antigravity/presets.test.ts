import { describe, expect, it } from "vitest";
import { DEFAULT_SYNTHESIZER_MODEL, PRESETS } from "../../src/config.js";
import { getDynamicBackups } from "../../src/helpers/rate-guard.js";
import { ServerContext } from "../../src/types.js";

const liveModelIds = new Set([
  "anthropic/claude-opus-4.7",
  "anthropic/claude-sonnet-4.6",
  "anthropic/claude-haiku-4.5",
  "google/gemini-3.1-flash-lite",
  "google/gemini-3.1-pro-preview",
  "meta-llama/llama-3.1-8b-instruct",
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "openai/gpt-5.4",
  "openai/gpt-5.4-nano",
  "openai/gpt-5.5",
  "qwen/qwen-2.5-72b-instruct",
  "qwen/qwen3-coder-next",
  "qwen/qwen3.7-flash",
  "x-ai/grok-4.20",
]);

function createContext(): ServerContext {
  return {
    axiosInstance: {} as ServerContext["axiosInstance"],
    rateLimiterConfig: { max_dollars: 10, warn_at_percent: 80, max_requests_per_minute: 20 },
    sessionUsage: { prompt_tokens: 0, completion_tokens: 0, cost: 0 },
    circuitBreakerMap: new Map(),
    tokenBucketMap: new Map(),
    pricingCache: {},
  };
}

describe("configured model IDs", () => {
  it("uses model IDs present in the OpenRouter catalog snapshot", () => {
    expect(DEFAULT_SYNTHESIZER_MODEL).toSatisfy((model) => liveModelIds.has(model));

    for (const [preset, models] of Object.entries(PRESETS)) {
      for (const model of models) {
        expect(liveModelIds, `${preset} preset contains stale model ${model}`).toContain(model);
      }
    }
  });

  it("uses catalog model IDs in static fallback tiers", () => {
    const ctx = createContext();
    const fallbacks = [
      ...getDynamicBackups(ctx, "anthropic/claude-opus-4.7"),
      ...getDynamicBackups(ctx, "openai/gpt-5.4-nano"),
    ];

    for (const model of fallbacks) {
      expect(liveModelIds, `fallback tier contains stale model ${model}`).toContain(model);
    }
  });
});
