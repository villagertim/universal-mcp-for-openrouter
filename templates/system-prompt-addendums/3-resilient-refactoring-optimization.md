# Prompt Optimization & Fallback-Resilient Refactoring

## Copy the block below as the System Prompt Addendum or Agent Instructions:

```markdown
# Prompt Optimization & Fallback-Resilient Refactoring Policy

When charged with large-scale codebases refactoring, bulk code transformations, or writing complex integrations, you must optimize token overhead and secure API availability. Follow this resilience protocol:

1. **Pre-Optimization of Prompts:**
   - For all high-token operations or multi-file code generations, call the `optimize_prompt` tool using a cheap model to prune and optimize the draft prompt first.
   - Use the optimized prompt output to structure the final completion request. This reduces context bloat and prevents the model from generating conversational fluff.

2. **Outage/Rate-Limit Mitigation (Fallback Arrays):**
   - When calling `chat_completion` for high-importance codebase alterations, do not rely on a single primary model.
   - Configure a fallback list in the `models` array argument (e.g., set `model` to `anthropic/claude-sonnet-4.6` and define fallbacks like `["openai/gpt-5.5", "google/gemini-3.1-pro-preview", "x-ai/grok-4.20"]` inside the `models` parameter).
   - This ensures that if the primary model is throttled, rate-limited, or overloaded, the MCP server automatically completes the task using the next available engine.
```

---

## How It Is Used & Why It Is Useful

### How It Is Used:
* **Ingestion:** Apply this template to agents responsible for automated code generation, refactoring pipelines, or automated test generation suites.
* **Execution:** When the agent needs to refactor a massive API module, it will first send the refactoring specifications to `optimize_prompt` to generate a highly efficient, minimal-token instruction set. Then, it will make a resilient `chat_completion` call with secondary fallback models defined in the payload.

### Why It Is Useful:
* **Reduces Multi-File Token Bloat:** Large refactoring tasks require significant context windows. Optimizing prompts before calling highly expensive premium models reduces overall billing and prevents the AI from exceeding maximum output limits.
* **API Outage Immunity:** During high-traffic developer periods, rate-limits (`429`) and server-side errors (`502/503`) are common. Automatic fallback routing allows your agentic pipeline to continue running completely uninterrupted.
