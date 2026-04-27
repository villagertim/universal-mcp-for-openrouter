# Blueprint: Cost-Aware Routing

> **Status**: Optional but Recommended  
> **Category**: Resource Management  
> **Applies to**: Any MCP-enabled agentic AI environment

---

## Purpose

When an AI agent has access to both a **locally selected model** (via subscription) and an **external MCP server** (like OpenRouter), it can inadvertently waste the user's money by routing inference tasks to the external service when the local model is perfectly capable.

This blueprint defines a **pre-flight routing check** that ensures the agent asks the human before incurring unnecessary external costs.

---

## The Problem

| Scenario | Cost Impact |
|---|---|
| User's local model is Claude Opus 4.6. Agent calls OpenRouter `chat_completion` with Claude Opus 4. | User pays **twice** for the same capability: once via subscription, once via OpenRouter credits. |
| User asks agent to "optimize this prompt." Agent uses `optimize_prompt` tool via MCP. | OpenRouter charges for the inference. The local model could have done the same work at no additional cost. |

---

## The Solution: The Routing Check

Before calling any **Inference Tool** via an external MCP server, the agent should:

1. **Classify the tool call**:
   - **Data Tool** (e.g., `list_models`, `get_balance`, `search_symbols`): No local equivalent exists. Proceed without asking.
   - **Inference Tool** (e.g., `chat_completion`, `optimize_prompt`, `recommend_model`): The local model can likely perform this task.

2. **If Inference Tool**: Evaluate whether the local model can handle the task.
   - **If YES**: Ask the human:
     > *"I can handle this task directly using your current model. Using OpenRouter would incur an additional cost. Would you like me to proceed locally, or do you have a specific reason to use an external model?"*
   - **If NO** (e.g., local model lacks vision capabilities, or the user needs a specific model architecture): Proceed with the MCP call, briefly stating why.

3. **Explicit User Requests** always override this check.

---

## Tool Classification Reference

| Tool Type | Examples | Ask Before Calling? |
|---|---|---|
| **Data** | `list_models`, `get_balance`, `get_key_info`, `get_session_usage`, `get_budget_status`, `index_project`, `search_symbols`, `reindex_project`, `dependency_graph` | ❌ No — no local equivalent |
| **Inference** | `chat_completion`, `chat_with_preset`, `optimize_prompt`, `recommend_model`, `correlate_errors` | ✅ Yes — local model can likely do this |
| **Capability** | `vision_analyze`, `semantic_code_search` | ⚠️ Depends — check if local model has the capability |
| **State** | `set_budget`, `pin_context`, `retrieve_context`, `clear_context` | ❌ No — these manage MCP server state |

---

## Implementation

To implement this in your own environment, add the following behavioral constraint to your agent's knowledge base or system prompt:

```text
Before calling any Inference Tool (chat_completion, chat_with_preset, optimize_prompt, 
recommend_model, correlate_errors) via the OpenRouter MCP, evaluate whether the currently 
selected local model can handle the task. If it can, ask the human for confirmation before 
incurring an external cost. Data Tools (list_models, get_balance, index_project, etc.) 
are exempt — they have no local equivalent.
```

---

## Why This Matters

- **Cost Efficiency**: Prevents double-paying for the same intelligence.
- **Quota Preservation**: Keeps external API costs predictable.
- **Transparency**: The human always knows when external resources are being consumed.
- **Trust**: The agent demonstrates fiscal responsibility, reinforcing the human-agent partnership.

---

*Part of the Agent Transparency Blueprint · Optional but Recommended*
