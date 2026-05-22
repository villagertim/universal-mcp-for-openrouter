// SPDX-License-Identifier: MIT

import { guardedCompletionPost, getDynamicBackups } from "file:///home/tim/dev/projects/openrouter-mcp/build/helpers/rate-guard.js";
import assert from "assert";

console.log("=== Starting Dynamic Failover Routing Integration Tests ===");

// 1. Setup Mock Server Context
const mockModelsCache = [
  {
    id: "anthropic/claude-3-opus",
    name: "Claude 3 Opus",
    context_length: 200000,
    pricing: { prompt: "0.000015", completion: "0.000075" }
  },
  {
    id: "google/gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    context_length: 2000000,
    pricing: { prompt: "0.00000125", completion: "0.000005" }
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    context_length: 128000,
    pricing: { prompt: "0.000005", completion: "0.000015" }
  },
  {
    id: "anthropic/claude-3-5-haiku",
    name: "Claude 3.5 Haiku",
    context_length: 200000,
    pricing: { prompt: "0.0000008", completion: "0.000004" }
  }
];

const createMockCtx = () => {
  const calledModels = [];
  const axiosInstanceMock = {
    post: async (url, data) => {
      calledModels.push(data.model);
      if (data.model === "anthropic/claude-3-opus") {
        const err = new Error("502 Bad Gateway");
        err.response = { status: 502, data: { error: { message: "Upstream rate limit or crash" } } };
        throw err;
      }
      return {
        data: {
          choices: [{ message: { role: "assistant", content: `Mock response from ${data.model}` } }],
          model: data.model,
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
        }
      };
    }
  };

  return {
    axiosInstance: axiosInstanceMock,
    rateLimiterConfig: {
      max_dollars: 10.00,
      warn_at_percent: 80,
      max_requests_per_minute: 20,
      disable_failover: false,
      fallback_price_multiplier: 1.5
    },
    sessionUsage: { prompt_tokens: 0, completion_tokens: 0, cost: 0.0 },
    circuitBreakerMap: new Map(),
    tokenBucketMap: new Map(),
    pricingCache: {},
    modelsCache: mockModelsCache,
    calledModels
  };
};

// 2. Test getDynamicBackups
console.log("\n1. Testing dynamic backup calculation:");
const ctx1 = createMockCtx();
const backups = getDynamicBackups(ctx1, "anthropic/claude-3-opus");
console.log("Calculated backups for claude-3-opus:", backups);
assert.ok(backups.includes("google/gemini-1.5-pro"), "Should suggest Gemini 1.5 Pro as fallback");
assert.ok(backups.includes("anthropic/claude-3-5-haiku"), "Should suggest Claude 3.5 Haiku as fallback");
assert.ok(!backups.includes("anthropic/claude-3-opus"), "Should never suggest the primary model as a fallback");
console.log("✅ Dynamic backup calculation passed!");

// 3. Test Successful Failover Routing
console.log("\n2. Testing successful failover routing loop:");
const ctx2 = createMockCtx();
const response2 = await guardedCompletionPost(ctx2, "anthropic/claude-3-opus", {
  prompt: "Help me write a dynamic proxy in TypeScript"
});

console.log("Called models in order:", ctx2.calledModels);
assert.strictEqual(ctx2.calledModels.length, 2, "Should call primary model and then fallback");
assert.strictEqual(ctx2.calledModels[0], "anthropic/claude-3-opus", "Primary model should be tried first");
assert.strictEqual(ctx2.calledModels[1], backups[0], "First fallback candidate should be tried next");
assert.strictEqual(response2.data.model, backups[0], "Response metadata should match successful fallback model");
console.log("✅ Failover routing loop passed!");

// 4. Test State Integrity (Circuit Breaker Tripping)
console.log("\n3. Testing local safety state integrity (circuit breaker):");
const ctx3 = createMockCtx();

// Force primary model to fail multiple times to trip its circuit breaker
for (let i = 0; i < 3; i++) {
  try {
    await guardedCompletionPost(ctx3, "anthropic/claude-3-opus", { prompt: "Test query" });
  } catch (e) {
    // Ignore failover successes/errors, we just want to count consecutive primary failures
  }
}

const cbState = ctx3.circuitBreakerMap.get("anthropic/claude-3-opus");
assert.ok(cbState, "Circuit breaker state should exist for failed primary model");
assert.ok(cbState.failures >= 3, "Failure count should track correctly");
assert.ok(cbState.open_until > Date.now(), "Circuit breaker should be OPEN");

// Run another completion query, verifying that it skips the open circuit primary model instantly
ctx3.calledModels.length = 0; // reset logs
const response3 = await guardedCompletionPost(ctx3, "anthropic/claude-3-opus", { prompt: "Skip circuit query" });
console.log("Called models while primary is circuit-broken:", ctx3.calledModels);
assert.ok(!ctx3.calledModels.includes("anthropic/claude-3-opus"), "Should NOT call the primary model while it is circuit-broken");
assert.strictEqual(ctx3.calledModels[0], backups[0], "Should route straight to the fallback model");
console.log("✅ State integrity and circuit-breaker integration passed!");

// 5. Test Disable Failover Bypass Environment Variable
console.log("\n4. Testing bypass environment variable DISABLE_FAILOVER=true:");
const ctx4 = createMockCtx();
process.env.DISABLE_FAILOVER = "true";

try {
  await guardedCompletionPost(ctx4, "anthropic/claude-3-opus", { prompt: "Bypass test" });
  assert.fail("Should have propagated error when failover is bypassed");
} catch (error) {
  console.log("Successfully intercepted expected bypass error:", error.message);
  assert.ok(error.message.includes("502 Bad Gateway") || error.message.includes("Upstream rate limit"), "Error should be the original primary failure");
}
assert.strictEqual(ctx4.calledModels.length, 1, "Should only attempt the primary model");
process.env.DISABLE_FAILOVER = "false"; // Reset
console.log("✅ Bypass environment variable path passed!");

console.log("\n✨ ALL DYNAMIC FAILOVER ROUTING TESTS COMPLETED SUCCESSFULLY! ✨");
