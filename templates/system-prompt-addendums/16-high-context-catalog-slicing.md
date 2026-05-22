# High-Context Codebase Navigation & Intelligent Routing

## Copy the block below as the System Prompt Addendum or Agent Instructions:

```markdown
# High-Context Codebase Navigation & Intelligent Routing Policy

You are tasked with navigating, refactoring, or indexing high-context codebases. Because large file contexts can rapidly consume tokens and exceed budgets, you must dynamically slice the model catalog based on task context requirements:

1. **Leverage Intelligent Resource Routing (Preferred):**
   - Instead of manually filtering the model list and sorting prices, invoke the `chat_routed` tool for text generation.
   - Pass the prompt and select a `strictness` mode:
     - `'cost'` (default): Strictly filters and executes on the cheapest eligible model matching your context size requirements.
     - `'quality'`: Sorts models by performance tiers (Frontier vs. Flash) first, selecting the cheapest candidate within the highest available tier.
   - The server dynamically estimates prompt token size, adds a 4,000 token headroom buffer, queries the local catalog cache, checks active circuit breakers, filters vision requirements, and routes execution down this optimized cascade, returning rich routing metadata back to you.

2. **Manual Model Slicing Fallback:**
   - If manual catalog pruning is required:
     - Calculate the prompt token size and add a 50% safety buffer.
     - Call the `filter_models` tool to locate an optimal model conforming to:
       * `min_context_length` matching your estimated token count.
       * `max_price_per_1m_prompt` matching the cost ceiling set by the user.
       * `supports_vision` if the prompt contains images.
     - Select the cheapest model from the returned list.
```

---

## How It Is Used & Why It Is Useful

### How It Is Used:
* **Ingestion:** Inject this block into your agentic assistant's prompt instructions when working on large, legacy systems, multi-repo codebases, or complex monorepos.
* **Execution:** Prior to reading a 40,000-line legacy module, the agent utilizes `chat_routed`. The routing engine automatically calculates that the input requires a 90k context window, filters out cheap 8k-context models, checks active circuit breakers, and completes the call on the cheapest available high-context provider (e.g. Gemini 1.5 Flash), appending comprehensive performance telemetry to the response.

### Why It Is Useful:
* **Eliminates Manual Overhead:** The agent no longer needs to waste API tokens running manual estimation, local sorting, and selection loops. The middleware layer handles context slicing natively in sub-milliseconds.
* **Prevents Context Overflow Crashes:** Standard models crash or truncate inputs when prompt sizes exceed their physical limits. `chat_routed` guarantees that the selected cascade candidate possesses the exact token context capacity required.
* **Bypasses Costly API Expenses:** Automatically prepends local model proxy candidates (`openrouter-auto` routing to `http://localhost:4002/v1`) if `PREFER_LOCAL_MODEL=true` is set in the environment, letting local developer setups process large prompts for zero cost.
