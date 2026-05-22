// SPDX-License-Identifier: MIT

import { registerChatTools } from "file:///home/tim/dev/projects/openrouter-mcp/build/tools/chat.js";
import assert from "assert";

console.log("=== Starting Ensemble Multi-Model Consensus (Parallel Voting) Integration Tests ===");

// Set mock API key to pass pre-flight validation
process.env.OPENROUTER_API_KEY = "mock-openrouter-key-123";

// 1. Setup Mock Models Cache & Pricing Cache
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
    id: "deepseek/deepseek-chat",
    name: "DeepSeek Chat",
    context_length: 64000,
    pricing: { prompt: "0.00000014", completion: "0.00000028" }
  }
];

const mockPricingCache = {};
for (const m of mockModelsCache) {
  mockPricingCache[m.id] = m.pricing;
}

// 2. Helper to construct a Mock Server Context
const createMockCtx = (options = {}) => {
  const {
    failingModels = [],
    synthesizerFails = false,
    maxDollars = 10.00
  } = options;

  const calledModels = [];
  
  const axiosInstanceMock = {
    post: async (url, data) => {
      calledModels.push(data.model);
      
      // Simulate Candidate Failure
      if (failingModels.includes(data.model)) {
        const err = new Error(`500 Internal Server Error for ${data.model}`);
        err.response = { status: 500, data: { error: { message: "Model overloaded" } } };
        throw err;
      }

      // Simulate Synthesizer Failure
      const isSynthesizerQuery = data.messages && data.messages.some(m => m.role === "system" && m.content.includes("Consensus Synthesizer"));
      if (isSynthesizerQuery && synthesizerFails) {
        const err = new Error(`503 Service Unavailable for Synthesizer ${data.model}`);
        err.response = { status: 503, data: { error: { message: "Synthesizer crashed" } } };
        throw err;
      }

      // Return normal successful response
      if (isSynthesizerQuery) {
        return {
          data: {
            choices: [{ message: { role: "assistant", content: "Synthesized optimal consensus response based on multiple sources." } }],
            model: data.model,
            usage: { prompt_tokens: 300, completion_tokens: 150, total_tokens: 450 }
          }
        };
      } else {
        return {
          data: {
            choices: [{ message: { role: "assistant", content: `Detailed response from candidate model: ${data.model}` } }],
            model: data.model,
            usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
          }
        };
      }
    }
  };

  return {
    axiosInstance: axiosInstanceMock,
    rateLimiterConfig: {
      max_dollars: maxDollars,
      warn_at_percent: 80,
      max_requests_per_minute: 20,
      disable_failover: false,
      fallback_price_multiplier: 1.5
    },
    sessionUsage: { prompt_tokens: 0, completion_tokens: 0, cost: 0.0 },
    circuitBreakerMap: new Map(),
    tokenBucketMap: new Map(),
    pricingCache: mockPricingCache,
    modelsCache: mockModelsCache,
    calledModels
  };
};

// --- Test Suite Execution ---

// Test Case 1: Happy Path (All successful candidates + synthesizer succeeds)
{
  console.log("\n1. Testing Happy Path (Successful Consensus Synthesis)...");
  const ctx = createMockCtx();
  const { handlers } = registerChatTools(ctx);
  
  const result = await handlers.chat_ensemble({
    models: ["anthropic/claude-3-opus", "openai/gpt-4o", "deepseek/deepseek-chat"],
    prompt: "Write a high-performance HTTP router in Rust.",
    system_prompt: "Focus on zero-allocation route matching.",
    synthesizer_model: "google/gemini-1.5-pro",
    temperature: 0.7
  });

  assert.ok(!result.isError, "Result should not be an error");
  assert.ok(Array.isArray(result.content), "Result content must be an array");
  
  // Verify content segments
  const mainText = result.content.find(c => c.text && c.text.includes("Synthesized optimal consensus"));
  assert.ok(mainText, "Output should contain the synthesized response");

  const metadataText = result.content.find(c => c.text && c.text.includes("Ensemble Synthesis Metadata"));
  assert.ok(metadataText, "Output should contain the metadata footer");
  assert.ok(metadataText.text.includes("google/gemini-1.5-pro"), "Metadata should list the synthesizer model");

  const accordionsText = result.content.find(c => c.text && c.text.includes("<details>"));
  assert.ok(accordionsText, "Output should contain accordion details");
  assert.ok(accordionsText.text.includes("anthropic/claude-3-opus"), "Accordion should contain candidate responses");

  console.log("Called models:", ctx.calledModels);
  assert.strictEqual(ctx.calledModels.length, 4, "Should query 3 candidates in parallel + 1 synthesizer");
  assert.ok(ctx.sessionUsage.cost > 0, "Session usage cost should be tracked and updated");
  console.log(`✅ Happy path passed! Cost tracked: $${ctx.sessionUsage.cost.toFixed(6)}`);
}

// Test Case 2: Partial Candidate Failure
{
  console.log("\n2. Testing Partial Candidate Failure (One model fails, synthesis proceeds)...");
  process.env.DISABLE_FAILOVER = "true";
  const ctx = createMockCtx({
    failingModels: ["openai/gpt-4o"]
  });
  const { handlers } = registerChatTools(ctx);

  const result = await handlers.chat_ensemble({
    models: ["anthropic/claude-3-opus", "openai/gpt-4o", "deepseek/deepseek-chat"],
    prompt: "Compare async vs OS threads.",
    synthesizer_model: "google/gemini-1.5-pro"
  });

  process.env.DISABLE_FAILOVER = "false";

  assert.ok(!result.isError, "Should not return general error on partial candidate failures");
  
  // Verify warning header
  const warningHeader = result.content.find(c => c.text && c.text.includes("Partial Ensemble Failure Warning"));
  assert.ok(warningHeader, "Warning header should list failed candidate models");
  assert.ok(warningHeader.text.includes("openai/gpt-4o"), "Failed model should be mentioned in warning");

  const mainText = result.content.find(c => c.text && c.text.includes("Synthesized optimal consensus"));
  assert.ok(mainText, "Should still synthesize successfully");

  console.log("Called models:", ctx.calledModels);
  assert.strictEqual(ctx.calledModels.length, 4, "Parallel call attempts all 3, synthesizer called for success");
  console.log("✅ Partial candidate failure path passed!");
}

// Test Case 3: All Candidates Failure
{
  console.log("\n3. Testing All Candidates Failure (Synthesizer skipped, aborts)...");
  process.env.DISABLE_FAILOVER = "true";
  const ctx = createMockCtx({
    failingModels: ["anthropic/claude-3-opus", "openai/gpt-4o"]
  });
  const { handlers } = registerChatTools(ctx);

  const result = await handlers.chat_ensemble({
    models: ["anthropic/claude-3-opus", "openai/gpt-4o"],
    prompt: "Any prompt.",
    synthesizer_model: "google/gemini-1.5-pro"
  });

  process.env.DISABLE_FAILOVER = "false";

  assert.ok(result.isError, "Should fail completely when all candidate models fail");
  assert.ok(result.content[0].text.includes("All ensemble candidate requests failed"), "Error message should describe failure details");
  
  console.log("Called models:", ctx.calledModels);
  assert.strictEqual(ctx.calledModels.length, 2, "Only candidates called; synthesizer never reached");
  console.log("✅ All candidates failure path passed!");
}

// Test Case 4: Synthesizer Failure
{
  console.log("\n4. Testing Synthesizer Failure (Candidates succeed, synthesizer crash throws error)...");
  const ctx = createMockCtx({
    synthesizerFails: true
  });
  const { handlers } = registerChatTools(ctx);

  const result = await handlers.chat_ensemble({
    models: ["openai/gpt-4o", "deepseek/deepseek-chat"],
    prompt: "Another prompt.",
    synthesizer_model: "google/gemini-1.5-pro"
  });

  assert.ok(result.isError, "Should return error when synthesis fails");
  assert.ok(result.content[0].text.includes("Synthesizer model failed to merge outputs"), "Error details synthesizer issue");
  console.log("✅ Synthesizer failure path passed!");
}

// Test Case 5: Pessimistic Budget Pre-Flight Reject
{
  console.log("\n5. Testing Pessimistic Budget Reservation pre-flight rejection...");
  const ctx = createMockCtx({
    maxDollars: 0.0001  // Extremely low budget cap
  });
  const { handlers } = registerChatTools(ctx);

  const result = await handlers.chat_ensemble({
    models: ["anthropic/claude-3-opus", "openai/gpt-4o"],
    prompt: "Generative AI research.",
    synthesizer_model: "google/gemini-1.5-pro"
  });

  assert.ok(result.isError, "Should reject query pre-flight");
  assert.ok(result.content[0].text.includes("Pre-flight Budget Reservation Rejected"), "Should contain reservation rejection details");
  assert.strictEqual(ctx.calledModels.length, 0, "No external model requests should be launched since budget check is pre-flight");
  console.log("✅ Pessimistic budget pre-flight reject path passed!");
}

console.log("\n✨ ALL ENSEMBLE CONSENSUS IMPLEMENTATION TESTS COMPLETED SUCCESSFULLY! ✨");
