# OpenRouter MCP — Roadmap

> Final state: July 29, 2026. All phases complete including remediation sweeps.

---

## Implemented — All Phases

### Phase 1 — Safety Middleware ✅
**Tools:** `set_budget`, `get_budget_status`  
**Middleware:** `guardedCompletionPost` wraps every LLM API call

Every `/chat/completions` call passes three pre-flight checks before the request fires:
1. **Budget cap** — blocks when `sessionUsage.cost >= max_dollars`. Configured via `set_budget`, persisted to `rate_config.json`.
2. **Circuit breaker** — opens after 3 consecutive failures on a model; 60s cooldown; resets on success. Per-model state in `circuitBreakerMap`.
3. **Token bucket** — max 20 req/min per model (configurable); proportional refill. Per-model state in `tokenBucketMap`.

### Phase 2 — Semantic Code Search ✅
**Tools:** `reindex_project`, `semantic_code_search`

**Workflow:** `index_project` (fast, no API) → `reindex_project` (embed, API) → `semantic_code_search`

### Phase 3 — Dependency Graph ✅
**Tool:** `dependency_graph`
- npm and Cargo manifest parsing.
- Semver conflict detection.
- Upgrade ordering.

### Phase 4 — Modular Refactor ✅
**Architecture:** Monolith → Domain-specific modules
- **Extract Infrastructure:** Moved pricing, rate-limiting, embeddings, and context storage to `src/helpers/`.
- **Extract Tools:** Moved 19 tools into 8 domain modules in `src/tools/`.
- **Config-Driven:** Implemented `tools.config.json` for tool toggling.
- **Profiles:** Added support for `--profile` argument.
- **Antigravity Profile:** Created `profiles/antigravity.json` to prune redundant tools.

### Phase 5 — Performance & Safety Enhancements ✅
**State Caching, Firewalls, and Multi-criteria Filtering**
- **Zero-Network Instant Startup**: Loads full model lists and pricing cache instantly from `pricing_cache.json` on boot, running sync updates non-blockingly in the background.
- **Secret Redaction Firewall**: Intercepts chat completion prompts and embeddings payloads local-side to sanitize OpenRouter keys (`sk-or-v1-`), OpenAI API keys (`sk-proj-`), and multi-line PEM private keys (RSA, EC, OPENSSH, etc.). Supports developer escape hatch via `DISABLE_REDACTION=true`.
- **Fuzzy Model Filtering**: Added `filter_models` tool for fast local-side catalog search, context sizing, maximum prompt price caps, and vision-capability checks.
- **Diagnostics Setup**: Added `verify_setup` tool for instant validation of runtime conditions, folder permissions, and Node compatibility.

### Phase 6 — Resilience, Consensus & Routing ✅
**Robust Remote Failovers and Multi-Model Accord**
- **Dynamic Failover Routing**: Intercepts model completion calls, automatically failing over to comparable backup models (from the pricing cache or static maps) in the event of upstream API downtime, matching vision/context capabilities.
- **Parallel Multi-Model Consensus**: Added `chat_ensemble` tool to execute parallel queries across different reasoning engines, using a synthesizer model to critique and output a unified optimal path.
- **Real-Time Filesystem Watching**: Integrated an asynchronous native `fs.watch` loop that automatically and incrementally updates AST symbol indices and recalculates vector embeddings upon file edits/deletions.
- **Intelligent Model-Task Routing**: Exposed `chat_routed` to dynamically classify prompts and run them on the cheapest available model matching the target quality threshold.

### Phase 7 — Transitive Lockfile Auditing ✅
**Targeted Deep Dependency Trees**
- **Lockfile-Based Sweep**: Direct, fast offline parsing of `package-lock.json` and `Cargo.lock` files to sweep thousands of transitive dependencies in sub-milliseconds without triggering heavy sub-processes.
- **Path Tracing & Semver Audits**: Exposes focus-path tracing back to zero-in-degree roots and detects duplicate nested packages with semver conflicts.

### Phase 8 — Native Primitives & Security Modernization ✅
**Resources, Prompts, Domain Namespaces & Input Sanitization**
- **Native MCP Resources**: Implemented `openrouter://models`, `openrouter://budget/status`, `openrouter://account/balance`, and `openrouter://memory/all` URI schemas for passive data reading.
- **Native MCP Prompts**: Exposed structured agent system prompt templates (`cost-aware-orchestration`, `multi-model-consensus`, `autonomous-budget-safety`, etc.) via native MCP prompt discovery.
### Phase 9 — Technical Improvements & Multi-Manager Lockfile Sweeping ✅
**Expanded Secret Firewall, Lockfile Parsers, Pricing Cache TTL & VectorStore Abstraction**
- **Expanded Secret Redaction Firewall**: Extended local sanitization rules in `rate-guard.ts` to detect and mask Anthropic API keys (`sk-ant-api`), GitHub PATs (`ghp_` / `github_pat_`), AWS Access Keys (`AKIA`), and Google Cloud OAuth Tokens (`ya29`).
- **Multi-Manager Lockfile Parsing**: Added sub-millisecond Yarn (`yarn.lock`) and pnpm (`pnpm-lock.yaml`) parsers to `dependency_graph` alongside npm and Cargo.
- **Pricing Cache TTL Policy**: Implemented 24-hour timestamp tracking in `pricing_cache.json` with a stale-while-revalidate policy to eliminate unneeded startup background network calls.
- **VectorStore Abstraction**: Extracted `VectorStore` interface and `JsonVectorStore` implementation in `src/helpers/vector-store.ts` for scalable vector memory persistence.

### Phase 10 — High-Payoff Performance & Resilience ✅
**File Watcher Directory Pruning, Retry-After Headers & Adaptive Exponential Backoff**
- **Intelligent File Watcher Pruning**: Expanded `CODE_SKIP_DIRS` to prune build outputs, caches, virtualenvs, and IDE folders (`coverage`, `.venv`, `target`, `.turbo`, `.cache`, `.output`, `.nuxt`, `.svelte-kit`, `.out`, `out`, `.parcel-cache`) from real-time filesystem watchers.
- **HTTP `Retry-After` Header Parsing**: Intercepts `retry-after` and `retry-after-ms` response headers on HTTP 429 rate limit errors in `rate-guard.ts`.
- **Adaptive Circuit Breaker Backoff**: Replaced rigid 60s lockouts with dynamic exponential backoff starting at 5s (`5s ➔ 10s ➔ 20s ➔ 40s ➔ 60s cap`), returning healthy models to service faster.

### Phase 11 — Type Safety & Model ID Remediation ✅
**Full codebase typing, strict null-checking, and live catalog alignment**
- **Domain type safety**: Added `Tool`/`ToolModule`/`ToolHandler` interfaces, eliminated `any`-typed surfaces across domain layer and dispatcher.
- **`noUncheckedIndexedAccess`**: Enabled strict null indexing checks, fixed ~45 "possibly undefined" access errors across 7 files (regex groups, Map lookups, array indexing, PromiseSettledResult narrowing, object property access).
- **Model ID refresh**: Verified every runtime preset, static fallback tier, router backup model, vision default, and public example against the live OpenRouter catalog; added regression test coverage.
- **Configurable env path**: Replaced author-specific `~/dev/.env` with XDG-standard `~/.config/openrouter-mcp/.env`, overridable via `OPENROUTER_MCP_ENV_PATH`.
- **Retry-After unit fix**: Corrected HTTP Retry-After header parsing (RFC 7231 seconds vs milliseconds); surfaced swallowed init-load errors.

---

## What Was Cut and Why

| Tool | Reason |
|:---|:---|
| `run_command` | Full duplicate of Antigravity's native primitive with user-approval safety gate |
| `git_ops` | Covered by Antigravity's `run_command` + system git CLI |
| `checkpoint_context` | Duplicate of Antigravity's KI system + existing `pin_context` |
| `task_plan` | Antigravity natively plans and persists artifacts; no capability delta |
| `diff_review` | Antigravity IS the review model; only useful in headless pipelines |
| `webhook_listen` | Narrow use case; high infrastructure complexity; deferred |

---

## Safety Coverage Assessment

| Dimension | Status | Mechanism |
|:---|:---|:---|
| Cost / budget overruns | ✅ Addressed | `rate_limiter` budget cap + enforcement |
| Runaway API request loops | ✅ Addressed | Circuit breaker + token bucket |
| Dangerous command execution | ✅ (native) | Antigravity's user-approval gate |
| Autonomous code quality review | ⚠️ Agent judgment | No formal gate; acceptable for human-loop |
| Cross-model decision confidence | ✅ Addressed | `chat_ensemble` parallel consensus reviews |

---

## Future Roadmap (v3) — Outstanding Enhancements

| Idea | What it unlocks | Priority | Notes |
|:---|:---|:---:|:---|
| **Scalable Semantic Storage (Option F)** | Migrate `context_store.json` to SQLite or pgvector / ChromaDB when chunk counts exceed 10,000. | 🟡 Medium | Retained as technical debt / future enhancement to optimize startup memory and I/O locking at scale. |
| **Comprehensive Diagnostic Health Suite** | Expand `verify_setup` tool in `src/tools/verify.ts` to test write permissions for state JSONs, validate API key permissions via OpenRouter's `/auth/key` endpoint, and report V8 process memory footprint. | 🟡 Medium | Diagnostic & troubleshooting suite enhancement. |
| **Async SSE Streaming Completion Helper** | Add streaming chunk aggregation in `src/tools/chat.ts` for long-running reasoning model completions. | 🟡 Medium | Prevents gateway timeouts on complex prompts. |
| **Headless CI/CD diff_review (Option G)** | Structured `{ approve: boolean, issues[] }` review gate for automated pull request pipelines. | ⚪ Low | Only useful for headless CI/CD systems where interactive agents are not active. |

---

*Built and Verified by Antigravity · July 29, 2026*


