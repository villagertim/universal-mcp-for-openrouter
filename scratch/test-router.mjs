// SPDX-License-Identifier: MIT

import { estimateTokens, hasVisionCapability, RouterEngine } from "../build/helpers/router.js";
import { registerChatTools } from "../build/tools/chat.js";

async function main() {
  console.log("=== Starting Intelligent Model-Task Routing Integration Tests ===");

  // 1. Test Token Estimation
  console.log("\n1. Testing Token Estimation:");
  const testString = "Hello world! This is a simple test prompt containing several words to check estimation.";
  const estimated = estimateTokens(testString);
  console.log(`- String: "${testString}"`);
  console.log(`- Length: ${testString.length} chars, Word Count: ${testString.split(" ").length}`);
  console.log(`- Estimated Tokens: ${estimated}`);
  if (estimated > 15 && estimated < 30) {
    console.log("✅ Token estimation passed (in acceptable statistical bounds).");
  } else {
    console.error(`❌ Token estimation returned unexpected value: ${estimated}`);
    process.exit(1);
  }

  // 2. Test Vision Capability Check
  console.log("\n2. Testing Vision Capability Check:");
  const visionModel = { id: "openai/gpt-4o", name: "GPT-4o", context_length: 128000, pricing: { prompt: "5.00", completion: "15.00" } };
  const nonVisionModel = { id: "qwen/qwen-3.6-flash", name: "Qwen 3.6 Flash", context_length: 32768, pricing: { prompt: "0.07", completion: "0.14" } };
  const visCheck = hasVisionCapability(visionModel);
  const nonVisCheck = hasVisionCapability(nonVisionModel);
  console.log(`- Model 'gpt-4o' has vision? ${visCheck}`);
  console.log(`- Model 'qwen-3.6-flash' has vision? ${nonVisCheck}`);
  if (visCheck === true && nonVisCheck === false) {
    console.log("✅ Vision capability checks passed.");
  } else {
    console.error("❌ Vision capability checks failed!");
    process.exit(1);
  }

  // Mock pricing cache database
  const mockModelsCache = [
    { id: "cheap-flash", name: "Cheap Flash", context_length: 10000, pricing: { prompt: "0.05", completion: "0.10" } },
    { id: "medium-flash", name: "Medium Flash", context_length: 100000, pricing: { prompt: "0.20", completion: "0.40" } },
    { id: "expensive-frontier", name: "Expensive Frontier Pro", context_length: 200000, pricing: { prompt: "5.00", completion: "15.00" } },
    { id: "cheap-frontier-sonnet", name: "Claude Sonnet (Tier 1)", context_length: 200000, pricing: { prompt: "3.00", completion: "15.00" } },
    { id: "vision-model-special", name: "Special Vision", context_length: 50000, pricing: { prompt: "1.00", completion: "2.00", image: "0.003" } }
  ];

  const mockCtx = {
    axiosInstance: {},
    rateLimiterConfig: { max_dollars: 10.00, warn_at_percent: 80, max_requests_per_minute: 20 },
    sessionUsage: { prompt_tokens: 0, completion_tokens: 0, cost: 0.0 },
    circuitBreakerMap: new Map(),
    tokenBucketMap: new Map(),
    pricingCache: {},
    modelsCache: mockModelsCache
  };

  // 3. Test Cost Routing
  console.log("\n3. Testing Cost-Aware Routing (strictness: 'cost'):");
  const costResult = RouterEngine.selectCandidates(mockCtx, {
    prompt: "A simple fast task.",
    strictness: "cost"
  });
  console.log("- Selected Candidates:", costResult.candidates);
  console.log("- Decision Reason:", costResult.reason);
  // Should list cheap-flash first since it is cheapest ($0.05) and fits context
  if (costResult.candidates[0] === "cheap-flash") {
    console.log("✅ Cost-aware sorting successfully prioritized cheap-flash.");
  } else {
    console.error(`❌ Cost-aware sorting failed. Got: ${costResult.candidates[0]}`);
    process.exit(1);
  }

  // 4. Test Context Slicing Filter
  console.log("\n4. Testing Context Slicing Filters:");
  // A huge prompt that exceeds cheap-flash's 10,000 token limit
  const hugePrompt = "a".repeat(35000); // ~8,750 tokens. Context threshold needed is ~8,750 + 4,000 = 12,750.
  const largeResult = RouterEngine.selectCandidates(mockCtx, {
    prompt: hugePrompt,
    strictness: "cost"
  });
  console.log("- Candidates selected for huge prompt:", largeResult.candidates);
  // cheap-flash has context_length 10,000, so it must be filtered out!
  if (!largeResult.candidates.includes("cheap-flash")) {
    console.log("✅ Context filter successfully excluded cheap-flash for massive prompt.");
  } else {
    console.error("❌ Context filter failed to exclude cheap-flash!");
    process.exit(1);
  }

  // 5. Test Quality Routing
  console.log("\n5. Testing Quality-Prioritized Routing (strictness: 'quality'):");
  const qualityResult = RouterEngine.selectCandidates(mockCtx, {
    prompt: "Analyze this highly complex code module.",
    strictness: "quality"
  });
  console.log("- Quality Sorted Candidates:", qualityResult.candidates);
  // Claude Sonnet (Tier 1) and Expensive Frontier Pro are Tier 1 (contain 'sonnet', 'frontier' keywords)
  // Under quality strictness, they should be ranked before cheap-flash / medium-flash.
  // Within Tier 1, Claude Sonnet ($3.00) is cheaper than Expensive Frontier ($5.00), so it must be first!
  const first = qualityResult.candidates[0];
  const second = qualityResult.candidates[1];
  console.log(`- 1st Quality Candidate: "${first}"`);
  console.log(`- 2nd Quality Candidate: "${second}"`);
  if (first === "cheap-frontier-sonnet" && second === "expensive-frontier") {
    console.log("✅ Quality strictness successfully sorted by performance tier first, then cost.");
  } else {
    console.error("❌ Quality-aware sorting failed!");
    process.exit(1);
  }

  // 6. Test Circuit-Breaker Exclusion
  console.log("\n6. Testing Circuit-Breaker Integration:");
  // Trip circuit breaker for cheap-flash
  mockCtx.circuitBreakerMap.set("cheap-flash", { failures: 3, open_until: Date.now() + 60000 });
  const breakerResult = RouterEngine.selectCandidates(mockCtx, {
    prompt: "Simple task.",
    strictness: "cost"
  });
  console.log("- Candidates after cheap-flash breaker opened:", breakerResult.candidates);
  if (!breakerResult.candidates.includes("cheap-flash")) {
    console.log("✅ Circuit breaker successfully filtered out cheap-flash candidate.");
  } else {
    console.error("❌ Circuit breaker filter failed to exclude tripped model!");
    process.exit(1);
  }

  // 7. Test Local Proxy Detection (PREFER_LOCAL_MODEL Option)
  console.log("\n7. Testing PREFER_LOCAL_MODEL routing:");
  process.env.PREFER_LOCAL_MODEL = "true";
  const proxyResult = RouterEngine.selectCandidates(mockCtx, {
    prompt: "Task with proxy enabled.",
    strictness: "cost"
  });
  console.log("- Candidates with PREFER_LOCAL_MODEL=true:", proxyResult.candidates);
  if (proxyResult.candidates[0] === "openrouter-auto") {
    console.log("✅ Local model proxy successfully prepended as primary routing candidate.");
  } else {
    console.error("❌ Local model proxy was not prepended!");
    process.exit(1);
  }
  delete process.env.PREFER_LOCAL_MODEL;

  console.log("\n🎉 All Router Integration Tests Passed Successfully!");
}

main().catch((err) => {
  console.error("❌ Tests failed:", err);
  process.exit(1);
});
