# OpenRouter MCP — Project Summary

> Last updated: April 27, 2026

---

## What This Is

A production-ready MCP server that wraps the OpenRouter LLM API with 19 tools across six capability categories. Built to serve as the backbone for Antigravity, an AI coding agent doing advanced multi-repo development.

Now fully modularized and config-driven (Phase 4).

---

## Architecture (Modular)

The server is built on a **Domain-Specific Modular Architecture**. Instead of a monolith, tools and logic are isolated by concern.

### 1. Server Core (`src/index.ts`)
A lightweight orchestrator that:
- Initializes the MCP `Server` and `StdioServerTransport`.
- Loads tool configuration and profiles via `config-loader.ts`.
- Collects tools and handlers from domain modules.
- Routes requests to the appropriate module handlers.

### 2. Domain Tool Modules (`src/tools/`)
Tools are grouped into specialized modules:
- `chat.ts`: Chat completions, presets, recommendations.
- `models.ts`: Model listing and session usage metrics.
- `account.ts`: Balance and key information.
- `vision.ts`: Image analysis.
- `context.ts`: Semantic memory (pin/retrieve/clear).
- `code.ts`: Indexing, semantic code search, and reindexing.
- `analysis.ts`: Error correlation and dependency graphing.
- `budget.ts`: Budget management and status.

### 3. Shared Helpers (`src/helpers/`)
Centralized logic used across modules:
- `rate-guard.ts`: Budget enforcement, circuit breakers, and token buckets.
- `pricing.ts`: Cost tracking and model pricing cache.
- `embeddings.ts`: Vector generation and similarity logic.
- `context-store.ts`: JSON-based vector persistence.
- `config-loader.ts`: `tools.config.json` and profile loading.

---

## Config & Profiles

The server is **Config-Driven**, allowing you to toggle any tool via `tools.config.json`.

### Profiles
Profiles (found in `profiles/*.json`) allow for environment-specific toolsets.
- **Antigravity Profile**: Optimized for use with the Antigravity agent, disabling redundant internal tools.
- **Usage**: Pass `--profile <name>` as a CLI argument.

---

## Build History

| Date | Phase | What Was Built |
|:---|:---|:---|
| Apr 26, 2026 | Foundation | MCP server, 12 initial tools, pricing cache, CoT extraction |
| Apr 26, 2026 | Phase 1 | Rate limiter: budget cap, token bucket, circuit breaker |
| Apr 26, 2026 | Phase 2 | `reindex_project` + `semantic_code_search` pipeline |
| Apr 26, 2026 | Phase 3 | `dependency_graph` with npm + Cargo support |
| Apr 27, 2026 | Phase 4 | **Modular Refactor**: Extract tools/helpers + Config-driven toggling |
| Apr 27, 2026 | Phase 5 | **Testing & Verification**: 33 automated tests + Path security sanitization |

---

*Built and Verified by Antigravity · April 27, 2026*

