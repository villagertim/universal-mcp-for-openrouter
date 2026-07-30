import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerBudgetTools } from "../../src/tools/budget.js";
import { ServerContext } from "../../src/types.js";
import { AxiosInstance } from "axios";
import { guardedCompletionPost } from "../../src/helpers/rate-guard.js";
import * as configStore from "../../src/helpers/config-store.js";

vi.mock("../../src/helpers/config-store.js");

describe("Budget & Rate Limiting (#7)", () => {
  let mockCtx: ServerContext;
  let mockAxios: any;

  beforeEach(() => {
    mockAxios = { post: vi.fn() };
    mockCtx = {
      axiosInstance: mockAxios as unknown as AxiosInstance,
      rateLimiterConfig: { max_dollars: 1.00, warn_at_percent: 80, max_requests_per_minute: 20 },
      sessionUsage: { prompt_tokens: 0, completion_tokens: 0, cost: 0 },
      circuitBreakerMap: new Map(),
      tokenBucketMap: new Map(),
      pricingCache: {},
    };
    
    vi.clearAllMocks();
  });

  it("set_budget should update the configuration", async () => {
    const { handlers } = registerBudgetTools(mockCtx);
    vi.mocked(configStore.saveRateConfig).mockResolvedValue(Promise.resolve());

    const result = await handlers.set_budget({
      max_dollars: 25.00,
      warn_at_percent: 90
    });

    expect(mockCtx.rateLimiterConfig.max_dollars).toBe(25);
    expect(mockCtx.rateLimiterConfig.warn_at_percent).toBe(90);
    expect(configStore.saveRateConfig).toHaveBeenCalled();
    expect(result.content[0].text).toContain("Budget updated");
  });

  it("guardedCompletionPost should block requests when budget is exceeded", async () => {
    mockCtx.sessionUsage.cost = 1.05; // Over the $1.00 limit
    
    await expect(guardedCompletionPost(mockCtx, "model", {}))
      .rejects.toThrow("Budget cap reached");
    
    expect(mockAxios.post).not.toHaveBeenCalled();
  });

  it("guardedCompletionPost should trigger circuit breaker after failures", async () => {
    mockCtx.rateLimiterConfig.disable_failover = true;
    mockAxios.post.mockRejectedValue(new Error("API Error"));

    // 1st failure
    await expect(guardedCompletionPost(mockCtx, "bad-model", {})).rejects.toThrow();
    // 2nd failure
    await expect(guardedCompletionPost(mockCtx, "bad-model", {})).rejects.toThrow();
    // 3rd failure - should open the breaker
    await expect(guardedCompletionPost(mockCtx, "bad-model", {})).rejects.toThrow();

    // 4th call - should be blocked by circuit breaker without calling API
    await expect(guardedCompletionPost(mockCtx, "bad-model", {}))
      .rejects.toThrow("Circuit breaker open");
    
    expect(mockAxios.post).toHaveBeenCalledTimes(3);
  });

  it("get_budget_status should report open circuit breakers", async () => {
    const { handlers } = registerBudgetTools(mockCtx);
    
    // Manually open a breaker
    mockCtx.circuitBreakerMap.set("flaky-model", { 
      failures: 3, 
      open_until: Date.now() + 60000 
    });

    const result = await handlers.get_budget_status();

    expect(result.content[0].text).toContain("flaky-model: 🔴 OPEN");
  });

  it("guardedCompletionPost should respect token bucket rate limits", async () => {
    mockCtx.rateLimiterConfig.disable_failover = true;
    mockCtx.rateLimiterConfig.max_requests_per_minute = 1;
    mockAxios.post.mockResolvedValue({ data: {} });

    // 1st call - allowed
    await guardedCompletionPost(mockCtx, "model", {});
    
    // 2nd call - blocked
    await expect(guardedCompletionPost(mockCtx, "model", {}))
      .rejects.toThrow("Rate limit hit");
    
    expect(mockAxios.post).toHaveBeenCalledTimes(1);
  });
});
