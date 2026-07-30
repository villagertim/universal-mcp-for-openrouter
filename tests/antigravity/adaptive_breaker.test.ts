import { describe, it, expect, beforeEach } from "vitest";
import { recordFailure, recordSuccess, checkCircuitBreaker, checkTokenBucket } from "../../src/helpers/rate-guard.js";
import { ServerContext } from "../../src/types.js";

describe("Adaptive Circuit Breaker & Retry-After Header Parsing", () => {
  let mockCtx: ServerContext;

  beforeEach(() => {
    mockCtx = {
      axiosInstance: {} as any,
      rateLimiterConfig: { max_dollars: 10, warn_at_percent: 80, max_requests_per_minute: 20 },
      sessionUsage: { prompt_tokens: 0, completion_tokens: 0, cost: 0 },
      circuitBreakerMap: new Map(),
      tokenBucketMap: new Map(),
      pricingCache: {},
    };
  });

  it("should respect retry-after header in seconds", () => {
    const error = {
      response: {
        status: 429,
        headers: { "retry-after": "15" },
      },
    };

    recordFailure(mockCtx, "test-model", error);
    const cb = mockCtx.circuitBreakerMap.get("test-model");

    expect(cb).toBeDefined();
    expect(cb?.open_until).toBeGreaterThan(Date.now() + 14000);
    expect(cb?.open_until).toBeLessThanOrEqual(Date.now() + 16000);
    expect(checkCircuitBreaker(mockCtx, "test-model").allowed).toBe(false);
  });

  it("should respect retry-after-ms header in milliseconds", () => {
    const error = {
      response: {
        status: 429,
        headers: { "retry-after-ms": "3500" },
      },
    };

    recordFailure(mockCtx, "test-model", error);
    const cb = mockCtx.circuitBreakerMap.get("test-model");

    expect(cb).toBeDefined();
    expect(cb?.open_until).toBeGreaterThan(Date.now() + 3000);
    expect(cb?.open_until).toBeLessThanOrEqual(Date.now() + 4000);
  });

  it("should fallback to exponential backoff starting at 5s after 3 failures if no header is present", () => {
    const genericError = new Error("General error");

    recordFailure(mockCtx, "test-model", genericError); // 1
    recordFailure(mockCtx, "test-model", genericError); // 2
    expect(checkCircuitBreaker(mockCtx, "test-model").allowed).toBe(true);

    recordFailure(mockCtx, "test-model", genericError); // 3 -> 5s
    let cb = mockCtx.circuitBreakerMap.get("test-model");
    expect(cb?.open_until).toBeGreaterThan(Date.now() + 4000);
    expect(cb?.open_until).toBeLessThanOrEqual(Date.now() + 6000);

    recordFailure(mockCtx, "test-model", genericError); // 4 -> 10s
    cb = mockCtx.circuitBreakerMap.get("test-model");
    expect(cb?.open_until).toBeGreaterThan(Date.now() + 9000);
    expect(cb?.open_until).toBeLessThanOrEqual(Date.now() + 11000);
  });

  it("should reset circuit breaker state on recordSuccess", () => {
    const genericError = new Error("General error");
    recordFailure(mockCtx, "test-model", genericError);
    recordFailure(mockCtx, "test-model", genericError);
    recordFailure(mockCtx, "test-model", genericError);

    expect(checkCircuitBreaker(mockCtx, "test-model").allowed).toBe(false);

    recordSuccess(mockCtx, "test-model");
    expect(checkCircuitBreaker(mockCtx, "test-model").allowed).toBe(true);
  });
});

describe("Token Bucket Wait Calculation", () => {
  let mockCtx: ServerContext;

  beforeEach(() => {
    mockCtx = {
      axiosInstance: {} as any,
      rateLimiterConfig: { max_dollars: 10, warn_at_percent: 80, max_requests_per_minute: 20 },
      sessionUsage: { prompt_tokens: 0, completion_tokens: 0, cost: 0 },
      circuitBreakerMap: new Map(),
      tokenBucketMap: new Map(),
      pricingCache: {},
    };
  });

  it("should treat a large retry-after (seconds) header as seconds, not milliseconds", () => {
    const error = {
      response: {
        status: 429,
        headers: { "retry-after": "1200" },
      },
    };

    recordFailure(mockCtx, "big-retry-model", error);
    const cb = mockCtx.circuitBreakerMap.get("big-retry-model");

    expect(cb).toBeDefined();
    expect(cb?.open_until).toBeGreaterThan(Date.now() + 1_190_000);
    expect(cb?.open_until).toBeLessThanOrEqual(Date.now() + 1_210_000);
  });

  it("should report a wait matching 60/max seconds when bucket is drained", () => {
    for (let i = 0; i < 20; i++) checkTokenBucket(mockCtx, "tb-model");
    const result = checkTokenBucket(mockCtx, "tb-model");
    expect(result.allowed).toBe(false);
    const match = result.message?.match(/~(\d+)s/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBe(3);
  });
});
