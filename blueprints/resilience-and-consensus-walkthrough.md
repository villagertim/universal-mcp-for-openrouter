# Walkthrough — Advanced Resilience & Consensus Orchestration

We have successfully implemented and verified both Tier 1 and Tier 2 capabilities inside the Universal OpenRouter MCP Server:
1. **Dynamic Failover Routing (Tier 1 - Auto-Resilience)**
2. **Ensemble Multi-Model Consensus / Parallel Voting (Tier 2 - Ensemble Voting)**

These changes make the MCP server a robust, cost-guarded, and resilient gateway for multi-model developer operations.

---

## 🛠️ Tier 1: Dynamic Failover Routing (Auto-Resilience)

This upgrade introduces a robust client-side retry-and-failover system, shielding agentic loops from individual upstream model downtimes, rate limits, and network degradations.

### Changes Implemented
* **[types.ts](file:///home/tim/dev/projects/openrouter-mcp/src/types.ts):** Extended the `RateLimiterConfig` interface to support `disable_failover?: boolean` and `fallback_price_multiplier?: number`.
* **[config.ts](file:///home/tim/dev/projects/openrouter-mcp/src/config.ts):** Updated `DEFAULT_RATE_CONFIG` to configure default values:
  * `disable_failover: false`
  * `fallback_price_multiplier: 1.5`
* **[rate-guard.ts](file:///home/tim/dev/projects/openrouter-mcp/src/helpers/rate-guard.ts):** Added `getDynamicBackups(ctx, primaryModel, needsVision)`:
  * Excludes the `primaryModel` from the pool to avoid cyclic loops.
  * **Dynamic Tiering:** Searches for active candidate models within the same capability class (matching or better context length/vision support) and cost thresholds ($\le 1.5x$ cost of primary).
  * **Static Tiering:** Safely falls back to pre-mapped robust static tiers (Premium vs Flash/Cheap).
* **[rate-guard.ts](file:///home/tim/dev/projects/openrouter-mcp/src/helpers/rate-guard.ts):** Refactored `guardedCompletionPost` to loop through attempts (`[model, ...fallbacks]`):
  * Skips locally circuit-broken or rate-limited models instantly.
  * Logs failover events with `[Failover]` prefixes.
  * Integrates diagnostic error aggregation when all paths exhaust.
  * Bypasses failover loops if `DISABLE_FAILOVER=true` is set.

---

## 🛠️ Tier 2: Ensemble Multi-Model Consensus (Parallel Voting)

This upgrade adds a sophisticated consensus synthesis tool, `chat_ensemble`, allowing clients to poll up to 5 candidate models simultaneously, resiliently handle partial downtime, and synthesize a single optimal answer via an expert reviewer model.

### Changes Implemented
* **[types.ts](file:///home/tim/dev/projects/openrouter-mcp/src/types.ts):** Added the `ChatEnsembleArgs` interface for schema validation.
* **[config.ts](file:///home/tim/dev/projects/openrouter-mcp/src/config.ts):** Defined `DEFAULT_SYNTHESIZER_MODEL = "google/gemini-1.5-pro"`.
* **[rate-guard.ts](file:///home/tim/dev/projects/openrouter-mcp/src/helpers/rate-guard.ts):** Created `checkPessimisticBudget(ctx, models, maxTokens)` to solve concurrency overspend race conditions. It pre-allocates and reserves worst-case cumulative cost of all queried models before launching parallel request threads.
* **[chat.ts](file:///home/tim/dev/projects/openrouter-mcp/src/tools/chat.ts):** Registered the `chat_ensemble` tool and implemented `handleChatEnsemble`:
  * Enforces parallel querying using `Promise.allSettled`.
  * Integrates the grounding-anchored consensus synthesis prompt guiding the expert reviewer to critique candidate responses without introducing hallucinations.
  * Formats a premium markdown response featuring the synthesized consensus, partial failure warning headers (if any model goes offline), clear query metadata, and original responses nested inside collapsible `<details>` accordions.

---

## 🧪 Verification & Results

We wrote and executed automated integration test suites for both features in the `scratch/` directory.

### 1. Dynamic Failover Routing Tests
Executed via [test-failover.mjs](file:///home/tim/dev/projects/openrouter-mcp/scratch/test-failover.mjs):
```bash
=== Starting Dynamic Failover Routing Integration Tests ===

1. Testing dynamic backup calculation:
Calculated backups for claude-3-opus: [ 'anthropic/claude-3-5-haiku', 'google/gemini-1.5-pro' ]
✅ Dynamic backup calculation passed!

2. Testing successful failover routing loop:
[Failover] ⚠️ Model "anthropic/claude-3-opus" failed: Upstream rate limit or crash
[Failover] 🔄 Primary model "anthropic/claude-3-opus" failed. Attempting fallback: "anthropic/claude-3-5-haiku"...
[Failover] ⚡ Primary model "anthropic/claude-3-opus" failed. Transparently rerouted and completed via "anthropic/claude-3-5-haiku".
Called models in order: [ 'anthropic/claude-3-opus', 'anthropic/claude-3-5-haiku' ]
✅ Failover routing loop passed!

3. Testing local safety state integrity (circuit breaker):
[RateGuard] 🔴 Circuit breaker OPEN for "anthropic/claude-3-opus" after 3 failures. Cooldown: 60s.
[Failover] Skipping model "anthropic/claude-3-opus": Circuit breaker is open.
[Failover] 🔄 Primary model "anthropic/claude-3-opus" failed. Attempting fallback: "anthropic/claude-3-5-haiku"...
[Failover] ⚡ Primary model "anthropic/claude-3-opus" failed. Transparently rerouted and completed via "anthropic/claude-3-5-haiku".
Called models while primary is circuit-broken: [ 'anthropic/claude-3-5-haiku' ]
✅ State integrity and circuit-breaker integration passed!

4. Testing bypass environment variable DISABLE_FAILOVER=true:
Successfully intercepted expected bypass error: All completion attempts exhausted. Details: [anthropic/claude-3-opus]: Upstream rate limit or crash
✅ Bypass environment variable path passed!

✨ ALL DYNAMIC FAILOVER ROUTING TESTS COMPLETED SUCCESSFULLY! ✨
```

### 2. Ensemble Multi-Model Consensus Tests
Executed via [test-ensemble.mjs](file:///home/tim/dev/projects/openrouter-mcp/scratch/test-ensemble.mjs):
```bash
=== Starting Ensemble Multi-Model Consensus (Parallel Voting) Integration Tests ===

1. Testing Happy Path (Successful Consensus Synthesis)...
[Ensemble] 🚀 Starting multi-model consensus query:
[Ensemble] Candidates: anthropic/claude-3-opus, openai/gpt-4o, deepseek/deepseek-chat
[Ensemble] Synthesizer: google/gemini-1.5-pro
[Ensemble] 🔄 Merging and synthesizing consensus via "google/gemini-1.5-pro"...
[Ensemble] ✅ Consensus execution successfully completed.
Called models: [
  'anthropic/claude-3-opus',
  'openai/gpt-4o',
  'deepseek/deepseek-chat',
  'google/gemini-1.5-pro'
]
✅ Happy path passed! Cost tracked: $0.000000

2. Testing Partial Candidate Failure (One model fails, synthesis proceeds)...
[Ensemble] 🚀 Starting multi-model consensus query:
[Ensemble] Candidates: anthropic/claude-3-opus, openai/gpt-4o, deepseek/deepseek-chat
[Ensemble] Synthesizer: google/gemini-1.5-pro
[Failover] ⚠️ Model "openai/gpt-4o" failed: Model overloaded
[Ensemble] ⚠️ Model candidate "openai/gpt-4o" failed: All completion attempts exhausted. Details: [openai/gpt-4o]: Model overloaded
[Ensemble] 🔄 Merging and synthesizing consensus via "google/gemini-1.5-pro"...
[Ensemble] ✅ Consensus execution successfully completed.
Called models: [
  'anthropic/claude-3-opus',
  'openai/gpt-4o',
  'deepseek/deepseek-chat',
  'google/gemini-1.5-pro'
]
✅ Partial candidate failure path passed!

3. Testing All Candidates Failure (Synthesizer skipped, aborts)...
[Ensemble] 🚀 Starting multi-model consensus query:
[Ensemble] Candidates: anthropic/claude-3-opus, openai/gpt-4o
[Ensemble] Synthesizer: google/gemini-1.5-pro
[Failover] ⚠️ Model "anthropic/claude-3-opus" failed: Model overloaded
[Failover] ⚠️ Model "openai/gpt-4o" failed: Model overloaded
[Ensemble] ⚠️ Model candidate "anthropic/claude-3-opus" failed: All completion attempts exhausted. Details: [anthropic/claude-3-opus]: Model overloaded
[Ensemble] ⚠️ Model candidate "openai/gpt-4o" failed: All completion attempts exhausted. Details: [openai/gpt-4o]: Model overloaded
Called models: [ 'anthropic/claude-3-opus', 'openai/gpt-4o' ]
✅ All candidates failure path passed!

4. Testing Synthesizer Failure (Candidates succeed, synthesizer crash throws error)...
[Ensemble] 🚀 Starting multi-model consensus query:
[Ensemble] Candidates: openai/gpt-4o, deepseek/deepseek-chat
[Ensemble] Synthesizer: google/gemini-1.5-pro
[Ensemble] 🔄 Merging and synthesizing consensus via "google/gemini-1.5-pro"...
[Failover] ⚠️ Model "google/gemini-1.5-pro" failed: Synthesizer crashed
[Failover] 🔄 Primary model "google/gemini-1.5-pro" failed. Attempting fallback: "anthropic/claude-3.5-sonnet"...
[Failover] ⚠️ Model "anthropic/claude-3.5-sonnet" failed: Synthesizer crashed
[Ensemble] 🔴 Synthesizer "google/gemini-1.5-pro" failed: All completion attempts exhausted. Details: [google/gemini-1.5-pro]: Synthesizer crashed; [anthropic/claude-3.5-sonnet]: Synthesizer crashed
✅ Synthesizer failure path passed!

5. Testing Pessimistic Budget Reservation pre-flight rejection...
✅ Pessimistic budget pre-flight reject path passed!

✨ ALL ENSEMBLE CONSENSUS IMPLEMENTATION TESTS COMPLETED SUCCESSFULLY! ✨
```

---

## 📈 Key Insights & Architectural Guardrails

> [!IMPORTANT]
> - **Pessimistic Cost Safeguards:** Standard session budget checks evaluate against already spent usage. In highly concurrent scenarios (like querying 5 models at once), all threads could pass individual checks and subsequently exceed the budget together. Pre-flight pessimistic calculations guarantee that the server reserves safety caps before any outbound threads fire.
> - **Synthesizer Fault Tolerance:** Because our synthesis calls run through the resilient `guardedCompletionPost` function, any synthesis model downtimes are automatically saved by the Tier 1 fallback pipeline! If `google/gemini-1.5-pro` encounters issues, it transparently reroutes the synthesis itself to highly capable fallbacks like `anthropic/claude-3.5-sonnet`.
