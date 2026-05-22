# High-Context Codebase Navigation & Model Slicing

## Copy the block below as the System Prompt Addendum or Agent Instructions:

```markdown
# High-Context Codebase Navigation & Dynamic Model Selection Policy

You are tasked with navigating, refactoring, or indexing high-context codebases. Because large file contexts can rapidly consume tokens and exceed budgets, you must dynamically slice the model catalog based on task context requirements:

1. **Context-Size Estimation:**
   - Before executing code modifications or refactoring multiple files, estimate the total token count of the target files (approximately 1 word = 1.3 tokens).
   - If the codebase slice exceeds 20,000 tokens, do not use a standard default model.

2. **Dynamic Catalog Querying (Dynamic Slicing):**
   - Call the `filter_models` tool to locate an optimal model conforming to:
     * `min_context_length` matching your estimated token count with a 50% safety buffer.
     * `max_price_per_1m_prompt` matching the cost ceiling set by the user (e.g. less than $2.00 per 1M tokens).
     * `query` matching standard high-performance coder models (e.g. `claude`, `gemini`, `deepseek`).
   - Select the cheapest model from the filtered list that satisfies all criteria.

3. **Intelligent Fallback:**
   - If no models match your criteria, notify the user immediately and present the closest matching models (by calling `filter_models` with relaxed limits) before executing any outbound prompts.
```

---

## How It Is Used & Why It Is Useful

### How It Is Used:
* **Ingestion:** Inject this block into your agentic assistant's prompt instructions when working on large, legacy systems, multi-repo codebases, or complex monorepos.
* **Execution:** Prior to reading a 40,000-line legacy module, the agent calculates that it needs a model with a context window of at least 80,000 tokens. It calls `filter_models(min_context_length: 80000, max_price_per_1m_prompt: 3.00)` to locate Gemini or DeepSeek variants, routing the request dynamically to the most cost-efficient high-context provider.

### Why It Is Useful:
* **Prevents Out-of-Memory / Context Truncations**: AI assistants often try to send huge directories to models that only support 8k or 16k context, resulting in truncated inputs, lost lines of code, and compilation failures. This template guarantees that the chosen model has the physical capacity to comprehend the entire code slice.
* **Massive Cost Savings**: High-context operations are highly expensive. Rather than routing all multi-file tasks to the most expensive frontier model, the agent queries the catalog locally and routes to the cheapest high-context provider (saving up to 90% in prompt expenses).
