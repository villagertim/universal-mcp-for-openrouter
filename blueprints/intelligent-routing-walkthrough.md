# Walkthrough — Intelligent Model-Task Routing (Context-Aware Dynamic Resource Routing)

We have successfully implemented and verified **Tier 4 Option D: Intelligent Model-Task Routing (Context-Aware Dynamic Resource Routing)** inside the Universal OpenRouter MCP Server.

This upgrade turns the server into an **intelligent middleware layer**. Instead of the user or client agent hardcoding model IDs or presets, the server dynamically evaluates prompt size, required context length, vision capabilities, price limits, and active circuit-breaker states. It queries the local catalog to find the cheapest *eligible* models, ranks them, and cascades execution down this dynamic list, returning rich telemetry data back to the client.

---

## 🛠️ The Intelligent Router Engine (`src/helpers/router.ts`)

This module serves as the brain of the middleware layer, orchestrating resource optimization, capability filtering, and local bypasses.

### Key Capabilities Implemented
* **Robust Dynamic Token Estimation (`estimateTokens`):** Standardizes prompt size calculation using a safe, pessimistic upper-bound approximation `Math.max(Math.ceil(text.length / 4), Math.ceil(text.trim().split(/\s+/).length * 1.33))` based on character and word frequency statistics. This provides zero-dependency token estimation that is platform-independent.
* **Context-Size Slicing:** Excludes candidate models whose maximum context length is too small to safely process the prompt. It enforces a standard safety headroom buffer: `estimatedPromptTokens + outputBuffer (2,000) + safetyPad (2,000)` (4,000 tokens total).
* **Circuit-Breaker Exclusion:** Cross-checks the dynamic candidate list with active circuit breakers. Skip models with open breakers to prevent latency overheads or recurring failures.
* **Weighted Quality-vs-Cost Strategy Sorting (`strictness`):**
  * *Cost Mode (Default):* Strictly prioritizes the cheapest eligible models that satisfy the context, price cap, and vision filters.
  * *Quality Mode:* Automatically classifies models into tiers (Tier 1: Frontier Models like Claude 3.5 Sonnet, GPT-4o, Gemini Pro; Tier 2: Flash Models like Gemini Flash, Llama 3.1 70B). It prioritizes selecting a model *within the highest available tier* first, sorting by cost ascending within that performance tier.
* **Local Proxy Overrides (`PREFER_LOCAL_MODEL`):** Preprends a local proxy candidate (`openrouter-auto` routing to `http://localhost:4002/v1`) if `PREFER_LOCAL_MODEL=true` is set in the environment, facilitating cost-free local routing when port 4002 is active.

---

## 💎 Tool Registry & Telemetry Integration (`src/tools/chat.ts`)

* **Registered `chat_routed` Tool:** Added to `registerChatTools` with a robust schema validating inputs (`prompt`, `system_prompt`, `task_category`, `max_usd_price_per_1m_prompt`, `require_vision`, `strictness`, `temperature`, `max_tokens`).
* **Rich Telemetry Returns:** Appends a structured `routing_metadata` payload in the tool output:
  * `model_selected`: The actual model that successfully handled the prompt.
  * `prompt_tokens_estimated`: Estimated input token count.
  * `cost_per_1m_prompt_usd`: Prompt pricing for the selected model.
  * `routing_reason`: Detailed context about the engine's routing decision.
  * `candidates_considered`: List of model IDs evaluated by the routing engine.
  * `failover_models_tried`: List of model IDs that failed before a success occurred.
* **Preset Harmonization:** Refactored the existing `chat_with_preset` tool to map preset configurations onto `chat_routed` arguments, converting it into a thin, clean wrapper. This removes duplicate completion pathways, ensuring all presets instantly benefit from dynamic catalog updates, local proxy overrides, and circuit-breaker safety.

---

## 📂 Summary of Code Changes

### Central Routing & Telemetry
* **[types.ts](file:///home/tim/dev/projects/openrouter-mcp/src/types.ts):**
  * Added the `ChatRoutedArgs` interface.
* **[router.ts](file:///home/tim/dev/projects/openrouter-mcp/src/helpers/router.ts):**
  * Built the central `RouterEngine` helper, mapping catalog loading, token estimation, capability checking, circuit-breaker checks, cost-sorting, tier classification, and local proxy checks.
* **[chat.ts](file:///home/tim/dev/projects/openrouter-mcp/src/tools/chat.ts):**
  * Registered `chat_routed` and implemented the cascading handler `handleChatRouted`.
  * Refactored `handleChatWithPreset` to serve as a thin, lightweight wrapper around `handleChatRouted`.
* **[tools.config.json](file:///home/tim/dev/projects/openrouter-mcp/tools.config.json):**
  * Enabled `chat_routed: true` by default under global tool configuration.
* **[USER_MANUAL.md](file:///home/tim/dev/projects/openrouter-mcp/USER_MANUAL.md):**
  * Added detailed documentation for the `chat_routed` tool, including parameter tables, processing logs, example requests/returns, and full environment variable documentation for `PREFER_LOCAL_MODEL`.

---

## 🧪 Verification & Results

We wrote and executed a comprehensive automated integration test suite to validate cost/quality sorting, context slicing, circuit breakers, and local proxy overrides.

### Watcher Integration Tests
Executed via [test-router.mjs](file:///home/tim/dev/projects/openrouter-mcp/scratch/test-router.mjs):
```bash
=== Starting Intelligent Model-Task Routing Integration Tests ===
1. Testing Token Estimation:
- String: "Hello world! This is a simple test prompt containing several words to
 check estimation."
- Length: 87 chars, Word Count: 14
- Estimated Tokens: 22
✅ Token estimation passed (in acceptable statistical bounds).

2. Testing Vision Capability Check:
- Model 'gpt-4o' has vision? true
- Model 'qwen-3.6-flash' has vision? false
✅ Vision capability checks passed.

3. Testing Cost-Aware Routing (strictness: 'cost'):
- Selected Candidates: [
  'cheap-flash',
  'medium-flash',
  'vision-model-special',
  'cheap-frontier-sonnet',
  'expensive-frontier'
]
- Decision Reason: Routed based on context-size and pricing optimization.
✅ Cost-aware sorting successfully prioritized cheap-flash.

4. Testing Context Slicing Filters:
- Candidates selected for huge prompt: [
  'medium-flash',
  'vision-model-special',
  'cheap-frontier-sonnet',
  'expensive-frontier'
]
✅ Context filter successfully excluded cheap-flash for massive prompt.

5. Testing Quality-Prioritized Routing (strictness: 'quality'):
- Quality Sorted Candidates: [
  'cheap-frontier-sonnet',
  'expensive-frontier',
  'cheap-flash',
  'medium-flash',
  'vision-model-special'
]
- 1st Quality Candidate: "cheap-frontier-sonnet"
- 2nd Quality Candidate: "expensive-frontier"
✅ Quality strictness successfully sorted by performance tier first, then cost.

6. Testing Circuit-Breaker Integration:
- Candidates after cheap-flash breaker opened: [
  'medium-flash',
  'vision-model-special',
  'cheap-frontier-sonnet',
  'expensive-frontier'
]
✅ Circuit breaker successfully filtered out cheap-flash candidate.

7. Testing PREFER_LOCAL_MODEL routing:
- Candidates with PREFER_LOCAL_MODEL=true: [
  'openrouter-auto',
  'medium-flash',
  'vision-model-special',
  'cheap-frontier-sonnet',
  'expensive-frontier'
]
✅ Local model proxy successfully prepended as primary routing candidate.

🎉 All Router Integration Tests Passed Successfully!
```

---

## 📈 Key Insights & Architectural Guardrails

> [!IMPORTANT]
> * **The Cost-Aware Routing Blueprint:** When `PREFER_LOCAL_MODEL=true` is active, local workflows can entirely bypass external LLM API costs. By checking if the local proxy on port `4002` is active, developer agents can execute massive runs without incurring OpenRouter credits, making the agent setup highly cost-transparent.
> * **Headroom Defense:** Standardizing a headroom buffer of `4,000` tokens ensures the selected candidate can comfortably process inputs and generate comprehensive answers without context truncation or sudden cutoffs, maintaining robust processing limits.
