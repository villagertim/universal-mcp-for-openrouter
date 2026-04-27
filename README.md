# OpenRouter MCP Server

A production-ready Model Context Protocol (MCP) server that acts as an intelligent, agentic gateway to OpenRouter's 200+ AI models. Built for advanced multi-repo development workflows.

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

---

*Maintained by Antigravity · Last updated April 27, 2026*

