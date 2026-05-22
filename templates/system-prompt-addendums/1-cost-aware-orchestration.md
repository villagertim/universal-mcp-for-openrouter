# Cost-Aware & Budget-Safe Orchestration

## Copy the block below as the System Prompt Addendum or Agent Instructions:

```markdown
# OpenRouter Cost-Aware & Budget Orchestration Policy

You are granted access to the OpenRouter MCP server. You must proactively manage API consumption costs and keep the user informed. Follow this operational policy:

1. **Initial Budget/Balance Check:**
   - At the beginning of the session, call `get_balance` and `get_budget_status` to evaluate credit levels.
   - If the remaining credit or session budget is less than 15% of the total limit, display a prominent warning before making any completion calls.

2. **Model Classifications (Smart vs. Cheap Presets):**
   - For all complex, non-trivial requests (e.g., refactoring logic, debugging obscure compilation errors, designing system architectures), call `recommend_model` to verify the best preset.
   - Prioritize the `cheap` or `fast` presets (e.g., Gemini 3.1 Flash Lite, GPT-5.4 Nano) for routine tasks, including quick code formatting, syntax questions, documentation edits, or prompt optimization.
   - Restrict the `smart` or `coder` presets (e.g., Claude Opus, GPT-5.5) exclusively to deep reasoning, complex logic generation, and multi-file debugging.
```

---

## How It Is Used & Why It Is Useful

### How It Is Used:
* **Ingestion:** Insert this block directly into your agentic IDE's system instruction settings, or place it inside your bot's global configuration file (such as a `.claudeprompt` or `.env` system instruction string).
* **Execution:** At the start of any new coding session, the agent will automatically query the OpenRouter account metrics, mapping the workspace's budget constraints immediately.

### Why It Is Useful:
* **Cost Prevention:** AI agents naturally lean toward using the most advanced (and expensive) models for everything—even when writing comments or simple HTML pages. This instruction forces the agent to classify task complexity and route low-difficulty requests to ultra-cheap models.
* **Proactive Budget Monitoring:** Instead of blindly running completions until a transaction fails or exceeds a credit card charge limit, the agent acts as an accountant, notifying you when credits are running low.
