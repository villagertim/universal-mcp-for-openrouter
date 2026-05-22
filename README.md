# OpenRouter MCP Server

An unofficial, production-ready Model Context Protocol (MCP) server that acts as an intelligent, agentic gateway to OpenRouter's 200+ AI models. Built for advanced multi-repo development workflows.

Now fully modularized and config-driven for maximum flexibility.

---

## 🏗️ Architecture

The server follows a **Domain-Specific Modular Architecture**:

- **Server Core**: Lightweight orchestrator in `src/index.ts`.
- **Domain Modules**: Specialized toolsets in `src/tools/` (Chat, Models, Context, Code, etc.).
- **Shared Helpers**: Centralized infrastructure in `src/helpers/` (Rate limiting, Pricing, Embeddings).

---

## ⚙️ Configuration & Profiles

### Tool Toggling
You can enable or disable any tool without changing code via `tools.config.json` in the root directory.

### Profiles
Profiles allow you to quickly switch between different toolsets for different workflows.
- **Antigravity Profile**: Optimized for use with the Antigravity agent, disabling redundant internal tools.
- **Usage**: Pass the `--profile` argument to the server.

### CLI Arguments
| Argument | Description | Example |
|:---|:---|:---|
| `--profile` | Load a specific JSON profile from the `profiles/` directory | `--profile antigravity` |

---

## Installation & Setup

### 1. Install & Build

```bash
npm install
npm run build
```

### 2. Configure API Key

Create `.env` in the project root, or at `~/dev/.env` (the server checks both):

```env
OPENROUTER_API_KEY=sk-or-...
```

### 3. Register with your MCP Client

In your `mcp_config.json`:

```json
{
  "mcpServers": {
    "openrouter": {
      "command": "node",
      "args": ["/absolute/path/to/openrouter-mcp/build/index.js", "--profile", "antigravity"]
    }
  }
}
```

---

## Security & Cost Control

> [!CAUTION]
> **NOTICE TO USERS: Defense-in-Depth Budgeting**
> 
> The Universal MCP for OpenRouter provides powerful application-level budget controls (via the `set_budget` tool) and automatic circuit breakers. However, you should treat these tools as **just one line of defense** specifically tailored for application development and dynamic agentic workflows.
> 
> **You must ALWAYS implement infrastructure-level limits directly through OpenRouter.** 
> 
> If your IDE crashes, an agent enters an infinite loop that bypasses the MCP, or your API key is somehow exposed, the MCP's circuit breakers cannot protect you. To ensure true financial safety, follow these OpenRouter best practices:
> 
> 1. **Use Unique Keys:** Generate a unique OpenRouter API key specifically for this MCP server. Do not reuse a master key.
> 2. **Set Hard Key Limits:** In your OpenRouter Dashboard (Settings -> Keys), apply a strict USD spending limit to this specific key.
> 3. **Set Reset Frequencies:** Configure the key to reset daily or weekly rather than leaving it uncapped.
> 4. **Base Account Limits:** Ensure your base OpenRouter account has a global maximum spending limit configured.
> 
> Use OpenRouter's native limits to protect your wallet, and use the Universal MCP's budget tools to manage your agent's behavior.

---

## Usage Guide

### Basic Completions

```
chat_completion(prompt: "Explain how JWT refresh tokens work")
chat_with_preset(preset: "fast", prompt: "Summarize this in 3 bullets: ...")
```

### Budget Safety (set this first)

```
set_budget(max_dollars: 5.00, warn_at_percent: 75)
get_budget_status()
```

The budget cap is enforced **before** each API call fires. Configuration survives server restarts (`rate_config.json`). Circuit breakers open automatically after 3 consecutive failures on a model and reset after 60 seconds.

### Semantic Code Search (two-step workflow)

```
# Step 1 — index the project (fast, no API calls)
index_project(project_path: "/path/to/repo", project_name: "my-api")

# Step 2 — embed code chunks (calls OpenRouter embeddings API)
reindex_project(project_name: "my-api")

# Step 3 — search by intent
semantic_code_search(query: "where do we handle auth token expiry")
```

### Semantic Memory

```
# Pin an architectural decision
pin_context(
  text: "We use JWT with 15-min access tokens and 7-day refresh tokens.",
  tag: "decision",
  project: "auth-service"
)

# Retrieve relevant context later
retrieve_context(query: "how does authentication work", top_k: 3)
```

------

## 📋 Agent System Prompt Addendums

To help your agentic coding assistants (like Claude Code, OpenClaw, or Hermes) make the best use of this MCP server, we have provided structured system prompt templates in the [templates/system-prompt-addendums/](file:///home/tim/dev/projects/openrouter-mcp/templates/system-prompt-addendums) directory:

1. **[Cost-Aware & Budget-Safe Orchestration](file:///home/tim/dev/projects/openrouter-mcp/templates/system-prompt-addendums/1-cost-aware-orchestration.md):** Teaches the agent to route simple queries to cheap models and complex queries to premium models while tracking spending.
2. **[Image & Vision Analysis Fallback](file:///home/tim/dev/projects/openrouter-mcp/templates/system-prompt-addendums/2-non-visual-vision-fallback.md):** Guides text-based or terminal-based clients on how to use our `vision_analyze` tool to "see" image assets.
3. **[Prompt Optimization & Fallback Routing](file:///home/tim/dev/projects/openrouter-mcp/templates/system-prompt-addendums/3-resilient-refactoring-optimization.md):** Keeps major refactoring tasks cost-efficient and outage-resistant.
4. **[Multi-Service Log Correlation](file:///home/tim/dev/projects/openrouter-mcp/templates/system-prompt-addendums/4-distributed-diagnostics.md):** Instructs the agent to isolate log ingestion to debug system failures quietly.
5. **[Autonomous Loop Safety Policy](file:///home/tim/dev/projects/openrouter-mcp/templates/system-prompt-addendums/5-autonomous-loop-budget-safety.md):** A strict financial circuit breaker for autonomous background execution loops.
6. **[Workspace Memory & Long-Term Pinning](file:///home/tim/dev/projects/openrouter-mcp/templates/system-prompt-addendums/6-workspace-memory-pinning.md):** Solves conversation amnesia by persistently caching architectural and domain constraints.
7. **[High-Throughput Batch Operations](file:///home/tim/dev/projects/openrouter-mcp/templates/system-prompt-addendums/7-high-throughput-batch-operations.md):** Orchestrates multi-file conversions and template updates with cost-effective models.
8. **[CI/CD & Build Pipeline Diagnostics](file:///home/tim/dev/projects/openrouter-mcp/templates/system-prompt-addendums/8-pipeline-diagnostics.md):** Automates container crash diagnostics and patch validation to resolve build failures.
9. **[Monorepo Dependency & Semver Syncing](file:///home/tim/dev/projects/openrouter-mcp/templates/system-prompt-addendums/9-monorepo-dependency-sync.md):** Performs pre-commit audits to keep package dependencies fully aligned across microservices.
10. **[Enterprise Privacy & Sensitive Data Guardrails](file:///home/tim/dev/projects/openrouter-mcp/templates/system-prompt-addendums/10-enterprise-privacy-guardrails.md):** Redacts and mocks credentials or proprietary algorithms to prevent sensitive data leaks.
11. **[Multi-Model Peer Review & Consensus](file:///home/tim/dev/projects/openrouter-mcp/templates/system-prompt-addendums/11-multi-model-consensus.md):** Emulates a double-model consensus flow to audit mission-critical code for exploits and concurrency bugs.
12. **[Context Window Garbage Collection](file:///home/tim/dev/projects/openrouter-mcp/templates/system-prompt-addendums/12-context-garbage-collection.md):** Minimizes token pricing and eliminates hallucinations by periodically purging active context bloat.

Copy and paste these templates directly into your bot's system instructions or configuration environment to get started.

---

## Persistent Files

| File | Purpose |
|:---|:---|
| `context_store.json` | Vector store for `pin_context` and `reindex_project` embeddings |
| `symbol_index.json` | Symbol index from `index_project` |
| `rate_config.json` | Persisted budget cap and warning threshold |

---

## Notes

- **Reasoning models:** `<think>` blocks are automatically extracted and displayed separately.
- **Embedding models:** Pinned text uses `text-embedding-3-small`. Code chunks use `text-embedding-3-large`.
- **Custom Presets** can be modified in `src/config.ts`.
- **stdout is redirected to stderr** to protect the MCP stdio protocol stream.

*Maintained by Antigravity · Last updated May 21, 2026*

---

## ⚖️ Trademark Disclaimer

*"Universal MCP for OpenRouter" is an independent, community-developed project. It is not affiliated with, endorsed by, or officially connected to OpenRouter, Inc. "OpenRouter" is a trademark of OpenRouter, Inc.*


