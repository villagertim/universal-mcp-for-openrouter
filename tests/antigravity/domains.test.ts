import { describe, it, expect, beforeEach } from "vitest";
import { registerDomainModules } from "../../src/domains/index.js";
import { ServerContext } from "../../src/types.js";

describe("Domain Namespace Composition (Phase 3)", () => {
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

  it("should organize tool modules into domain namespaces", () => {
    const { domains, allToolModules, resourceModule, promptModule } = registerDomainModules(mockCtx);

    expect(domains.gateway.length).toBe(5); // chat, models, account, budget, vision
    expect(domains.intelligence.length).toBe(2); // code, context
    expect(domains.diagnostics.length).toBe(2); // analysis, verify

    expect(allToolModules.length).toBe(9);
    expect(resourceModule.resources.length).toBe(4);
    expect(promptModule.prompts.length).toBe(5);
  });
});
