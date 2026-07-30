# OpenRouter MCP Server

An unofficial, production-ready Model Context Protocol (MCP) server that acts as an intelligent, agentic gateway to OpenRouter's 200+ AI models. Built for advanced multi-repo development workflows.

Now fully modularized and config-driven for maximum flexibility.

---

## 🏗️ Architecture

The server follows a **Domain-Specific Modular Architecture**:

- **Server Core**: Lightweight orchestrator in `src/index.ts`.
- **Domain Orchestrator**: Namespace capability loader in `src/domains/index.ts` (Gateway, Intelligence, Diagnostics).
- **Domain Tool Modules**: Specialized toolsets in `src/tools/` (Chat, Models, Context, Code, etc.).
- **Native MCP Primitives**: Standard MCP Resources (`src/resources/`) and Prompts (`src/prompts/`).
- **Shared Helpers**: Centralized infrastructure in `src/helpers/` (Rate limiting, Pricing, Embeddings, Firewall).

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

### 🛡️ Secret Redaction & Prompt Injection Firewall
The server includes a built-in, local **Security Firewall** in `src/helpers/rate-guard.ts` (`sanitizeInputPrompt`) that automatically intercepts prompts and embeddings payloads to:
* **Redact API Keys & Credentials:**
  - OpenRouter API keys (`sk-or-v1-...`)
  - OpenAI API keys (`sk-proj-...`)
  - Anthropic API keys (`sk-ant-api...`)
  - GitHub Personal Access Tokens (`ghp_...` and `github_pat_...`)
  - AWS Access Key IDs (`AKIA...`)
  - Google Cloud / OAuth Tokens (`ya29....`)
  - Multi-line SSH & PEM private key blocks (`-----BEGIN ... KEY-----`)
* **Sanitize Prompt Injection Delimiters:** Strips or replaces context poisoning markers (`<|im_start|>system`, `[SYSTEM_INSTRUCTION_OVERRIDE]`) to prevent external prompt injection exploits.

This prevents accidental exposure of credentials to external network suppliers and protects against context poisoning. If you explicitly need to transmit raw credentials for testing or key rotation workflows, set `DISABLE_REDACTION=true`.

---

## Usage Guide

### Basic & Smart Chat Completions

```
# Direct Model completions (custom or auto)
chat_completion(prompt: "Explain how JWT refresh tokens work", model: "anthropic/claude-3-5-sonnet")

# Thin preset completion (smart, cheap, fast, coder, creative)
chat_with_preset(preset: "fast", prompt: "Summarize this in 3 bullets: ...")

# Intelligent dynamic routing (evaluates budget constraints and circuit breakers)
chat_routed(prompt: "Write a high-performance HTTP gateway", strictness: "quality")

# Parallel Multi-Model Consensus Peer Review (polls up to 5 models concurrently)
chat_ensemble(
  models: ["deepseek/deepseek-chat", "anthropic/claude-3.5-sonnet", "google/gemini-1.5-pro"],
  prompt: "Auditing constant-time cryptographic checks for timing attacks"
)
```

### Budget Safety (set this first)

```
set_budget(max_dollars: 5.00, warn_at_percent: 75)
get_budget_status()
```

The budget cap is enforced **before** each API call fires. Configuration survives server restarts (`rate_config.json`). Circuit breakers open automatically after failures, parsing HTTP `Retry-After` response headers (on 429 rate limits) or applying adaptive exponential backoff (5s ➔ 10s ➔ 20s ➔ 40s ➔ 60s max) so healthy models recover as soon as rate limits clear.

### Semantic Code Search (incremental background watch indexing)

```
# Step 1 — index the project (spins up background watchers with automatic build/cache directory pruning)
index_project(project_path: "/path/to/repo", project_name: "my-api")

# Step 2 — embed code chunks (uses MD5 checks to execute cost-free incremental reindexing)
reindex_project(project_name: "my-api")

# Step 3 — semantic search
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

### Deep Transitive Auditing & Diagnostics

```
# Parse lockfiles in sub-milliseconds and trace co-existing semver conflicts
dependency_graph(transitive: true, check_conflicts: true)

# Trace targeted deep dependency paths leading to a specific package
dependency_graph(transitive: true, focus_package: "lodash", max_depth: 5)

# Multi-service log correlation and cascading fault root-cause analysis
correlate_errors(logs: [
  { system_name: "API Gateway", content: "ERROR: Connection timeout after 30s" },
  { system_name: "Database Server", content: "WARN: Connection pool exhausted (100/100)" }
])
```

### 🌐 Native MCP Resources (`openrouter://...`)

Passive read-only state endpoints exposed directly as standard MCP Resources:

- `openrouter://models` — Cached model catalog, context limits, and token pricing rates.
- `openrouter://budget/status` — Real-time spend metrics, budget caps, and circuit breaker status.
- `openrouter://account/balance` — Credit balance and API key details.
- `openrouter://memory/all` — Pinned semantic context notes and workspace memory.

### 📝 Native MCP Prompts (`list_prompts` / `get_prompt`)

Structured system prompt templates discoverable via the MCP `prompts` capability:

- `cost-aware-orchestration` — Teaches agents budget-safe model selection and credit checks.
- `multi-model-consensus` — Configures parallel peer review workflows.
- `autonomous-budget-safety` — Financial circuit breaker policy for autonomous loops.
- `distributed-diagnostics` — Multi-service log correlation and trace isolation.
- `workspace-memory-pinning` — Workspace memory and architectural decision pinning.

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
13. **[OpenClaw CLI Loop-Stall & Log Pruning](file:///home/tim/dev/projects/openrouter-mcp/templates/system-prompt-addendums/13-openclaw-cli-loop-pruning.md):** Formulates terminal hygiene policies to prevent compilation locks and strip noise from test results.
14. **[Structured Planning & JSON Chaining](file:///home/tim/dev/projects/openrouter-mcp/templates/system-prompt-addendums/14-hermes-structured-tool-chaining.md):** Instructs Hermes-type JSON function call engines to compress reasoning steps and accelerate tool parallel execution.
15. **[Diagnostic Self-Healing & Pre-Flight Integration](file:///home/tim/dev/projects/openrouter-mcp/templates/system-prompt-addendums/15-diagnostic-self-healing.md):** Mandates early setup diagnostic checks and reactive troubleshooting to handle budget or runtime failures gracefully.
16. **[High-Context Codebase Navigation & Model Slicing](file:///home/tim/dev/projects/openrouter-mcp/templates/system-prompt-addendums/16-high-context-catalog-slicing.md):** Dynamically estimates file token sizes to query and select the most budget-efficient high-context models.
17. **[Real-Time Semantic Context & Background Indexing](file:///home/tim/dev/projects/openrouter-mcp/templates/system-prompt-addendums/17-realtime-semantic-watcher.md):** Instructs the agent to rely on automatic background filesystem watching and line-shift resilient incremental re-indexing, avoiding manual indexing commands.
18. **[Zero-Cost Local Proxy & Resilient Fallback Routing](file:///home/tim/dev/projects/openrouter-mcp/templates/system-prompt-addendums/18-local-proxy-overrides.md):** Teaches the agent to leverage local model endpoints for free routine generations while ensuring transparent remote LLM failover.

Copy and paste these templates directly into your bot's system instructions or configuration environment to get started.

---

## Persistent Files

| File | Purpose |
|:---|:---|
| `context_store.json` | Vector store for `pin_context` and `reindex_project` embeddings |
| `symbol_index.json` | Symbol index from `index_project` |
| `rate_config.json` | Persisted budget cap and warning threshold |
| `pricing_cache.json` | Serialized pricing and model catalog cache for zero-network startups |

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


