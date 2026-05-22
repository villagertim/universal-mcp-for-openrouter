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

---

## What Was Cut and Why

| Tool | Reason |
|:---|:---|
| `run_command` | Full duplicate of Antigravity's native primitive with user-approval safety gate |
| `git_ops` | Covered by Antigravity's `run_command` + system git CLI |
| `checkpoint_context` | Duplicate of Antigravity's KI system + existing `pin_context` |
| `task_plan` | Antigravity natively plans and persists artifacts; no capability delta |
| `diff_review` | Antigravity IS the review model; only useful in headless pipelines |
| `multi_model_consensus` | Medium value for current human-in-loop workflow; deferred |
| `webhook_listen` | Narrow use case; high infrastructure complexity; deferred |

---

## Safety Coverage Assessment

| Dimension | Status | Mechanism |
|:---|:---|:---|
| Cost / budget overruns | ✅ Addressed | `rate_limiter` budget cap + enforcement |
| Runaway API request loops | ✅ Addressed | Circuit breaker + token bucket |
| Dangerous command execution | ✅ (native) | Antigravity's user-approval gate |
| Autonomous code quality review | ⚠️ Agent judgment | No formal gate; acceptable for human-in-loop |
| Cross-model decision confidence | ❌ Deferred | `multi_model_consensus` not built |

---

## Possible Next Steps (v2)

| Idea | What it unlocks |
|:---|:---|
| `dependency_graph` v2 — transitive deps | Shell out to `npm ls --json` / `cargo tree` for full tree |
| `semantic_code_search` at scale | Migrate `context_store.json` to pgvector or ChromaDB when chunk count > 10k |
| Auto-watch + incremental reindex | `chokidar` file watcher triggers `reindex_project` on save |
| `multi_model_consensus` | Parallel model calls + judge synthesis for high-stakes decisions |
| `diff_review` | Structured `{ approve: boolean, issues[] }` gate for headless pipelines |

---

*Built by Antigravity · April 27, 2026*

