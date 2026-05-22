# OpenRouter MCP — Roadmap

> Final state: April 27, 2026. All four phases complete.

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
| **Scalable Semantic Storage (Option F)** | Migrate `context_store.json` to SQLite or pgvector / ChromaDB when chunk counts exceed 10,000. | 🟡 Medium | Retained as technical debt / future enhancement to optimize startup memory and I/O locking at scale. See [scalable-semantic-storage.md](file:///home/tim/dev/projects/openrouter-mcp/blueprints/scalable-semantic-storage.md) for the design layout. |
| **Headless CI/CD diff_review (Option G)** | Structured `{ approve: boolean, issues[] }` review gate for automated pull request pipelines. | ⚪ Low | Only useful for headless CI/CD systems where interactive agents are not active. |

---

*Built by Antigravity · May 22, 2026*


