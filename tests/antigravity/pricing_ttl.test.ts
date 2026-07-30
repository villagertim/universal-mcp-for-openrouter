import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadPricingCacheFromDisk, refreshPricingCache, PRICING_CACHE_TTL_MS } from "../../src/helpers/pricing.js";
import { ServerContext } from "../../src/types.js";
import fs from "fs/promises";

vi.mock("fs/promises");

describe("Pricing Cache TTL & Stale-While-Revalidate (Phase 3)", () => {
  let mockCtx: ServerContext;
  let mockAxios: any;

  beforeEach(() => {
    mockAxios = { get: vi.fn() };
    mockCtx = {
      axiosInstance: mockAxios as any,
      rateLimiterConfig: { max_dollars: 10, warn_at_percent: 80, max_requests_per_minute: 20 },
      sessionUsage: { prompt_tokens: 0, completion_tokens: 0, cost: 0 },
      circuitBreakerMap: new Map(),
      tokenBucketMap: new Map(),
      pricingCache: {},
    };

    vi.clearAllMocks();
  });

  it("should recognize fresh cache when last_updated is within 24h", async () => {
    const freshData = {
      last_updated: Date.now() - 3600000, // 1 hour ago
      models: [{ id: "google/gemini-1.5-flash", name: "Gemini Flash", context_length: 1000000, pricing: { prompt: "0", completion: "0" } }],
    };
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(freshData));

    const res = await loadPricingCacheFromDisk(mockCtx);

    expect(res.loaded).toBe(true);
    expect(res.isFresh).toBe(true);
    expect(mockCtx.pricingCache["google/gemini-1.5-flash"]).toBeDefined();
  });

  it("should recognize stale cache when last_updated is older than 24h", async () => {
    const staleData = {
      last_updated: Date.now() - (PRICING_CACHE_TTL_MS + 3600000), // 25 hours ago
      models: [{ id: "google/gemini-1.5-flash", name: "Gemini Flash", context_length: 1000000, pricing: { prompt: "0", completion: "0" } }],
    };
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(staleData));

    const res = await loadPricingCacheFromDisk(mockCtx);

    expect(res.loaded).toBe(true);
    expect(res.isFresh).toBe(false);
  });

  it("should skip remote refresh if cache is fresh and force is false", async () => {
    await refreshPricingCache(mockCtx, { isFresh: true, force: false });

    expect(mockAxios.get).not.toHaveBeenCalled();
  });

  it("should execute remote refresh if cache is stale or force is true", async () => {
    mockAxios.get.mockResolvedValue({
      data: {
        data: [{ id: "google/gemini-1.5-flash", name: "Gemini Flash", context_length: 1000000, pricing: { prompt: "0", completion: "0" } }],
      },
    });

    await refreshPricingCache(mockCtx, { isFresh: false, force: false });

    expect(mockAxios.get).toHaveBeenCalledWith("/models");
    expect(fs.writeFile).toHaveBeenCalled();
  });
});
