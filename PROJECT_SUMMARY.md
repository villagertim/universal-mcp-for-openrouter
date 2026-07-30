# OpenRouter MCP — Project Summary

> Last updated: July 29, 2026

---

## What This Is

A production-ready MCP server that wraps the OpenRouter LLM API with 24 tools, native MCP Resources, and native MCP Prompts across domain capability categories. Built to serve as the backbone for Antigravity, an AI coding agent doing advanced multi-repo development.

Now fully modularized, performance-optimized, and security-hardened.

---

## Architecture (Modular)

The server is built on a **Domain-Specific Modular Architecture**. Instead of a monolith, tools, primitives, and logic are isolated by concern.

### 1. Server Core (`src/index.ts`) & Domain Orchestration (`src/domains/`)
A lightweight orchestrator that:
- Initializes the MCP `Server` and `StdioServerTransport`.
- Loads tool configuration and profiles via `config-loader.ts`.
- Initializes capability modules via domain namespaces (`gateway`, `intelligence`, `diagnostics`) in `src/domains/index.ts`.
- Registers native MCP Resources (`src/resources/`) and native MCP Prompts (`src/prompts/`).

### 2. Domain Tool Modules (`src/tools/`)
Tools are grouped into specialized modules:
- `chat.ts`: Chat completions, presets, recommendations, ensemble parallel voting consensus, and intelligent routing.
- `models.ts`: Catalog listing, fuzzy filtering (`filter_models`), and session usage metrics.
- `account.ts`: Balance and key information.
- `vision.ts`: Image analysis.
- `context.ts`: Semantic memory (pin/retrieve/clear).
- `code.ts`: Indexing, semantic code search, and reindexing.
- `analysis.ts`: Error correlation and dependency graphing.
- `budget.ts`: Budget management and status.
- `verify.ts`: Diagnostic suite environment verification (`verify_setup`).

### 3. Native Primitives (`src/resources/` & `src/prompts/`)
- `resources/index.ts`: Exposes read-only state URIs (`openrouter://models`, `openrouter://budget/status`, `openrouter://account/balance`, `openrouter://memory/all`).
- `prompts/index.ts`: Exposes native system prompt templates (`cost-aware-orchestration`, `multi-model-consensus`, `autonomous-budget-safety`, etc.).

### 4. Shared Helpers (`src/helpers/`)
Centralized logic used across modules:
- `rate-guard.ts`: Budget enforcement, circuit breakers, token buckets, secret redaction, and prompt injection delimiter sanitization (`sanitizeInputPrompt`).
- `router.ts`: Intelligent token estimation, dynamic model slicing context filters, quality/cost sorting, and local overrides.
- `pricing.ts`: Cost tracking and model pricing cache.
- `embeddings.ts`: Vector generation and similarity logic.
- `context-store.ts`: JSON-based vector persistence.
- `watcher.ts`: Debounced filesystem watchers and line-shift resilient MD5 reuse guards.
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
| May 21, 2026 | Phase 6 | **Performance & Safety**: local cache (`pricing_cache.json`), Key firewall, `filter_models`, `verify_setup` |
| May 21, 2026 | Phase 7 | **Resilience, Consensus & Routing**: dynamic retry-on-failover, ensemble consensus reviews, FS real-time incremental watch indexing, and intelligent model-task routing |
| May 22, 2026 | Phase 8 | **Transitive Lockfile Auditing**: Deep lockfile-based transitive dependency analysis, conflict auditing, and targeted resolution paths |
| Jul 29, 2026 | Phase 9 | **MCP Modernization Rollout**: Native MCP Resources (`openrouter://`), native MCP Prompts, domain namespaces (`src/domains/`), and input prompt sanitization |
| Jul 29, 2026 | Phase 10 | **Technical Improvements Rollout**: Expanded secret firewall (Anthropic, GitHub, AWS, GCP), Yarn & pnpm lockfile parsing, pricing cache 24h TTL policy, and `VectorStore` abstraction |
| Jul 29, 2026 | Phase 11 | **High-Payoff Performance & Resilience**: File watcher directory pruning (`coverage`, `.venv`, `target`, etc.), HTTP `Retry-After` header parsing, and adaptive exponential circuit breaker backoff (5s ➔ 60s cap) |
| Jul 29, 2026 | Phase 12 | **Type Safety & Model ID Remediation**: Domain type interfaces (`Tool`/`ToolModule`/`ToolHandler`), `noUncheckedIndexedAccess` enabled with ~45 fixed null-access errors, live catalog model ID refresh across all runtime defaults and public examples, Retry-After unit fix, configurable env path, and full remediation of 13 review issues |

---

*Built and Verified by Antigravity · July 29, 2026*

