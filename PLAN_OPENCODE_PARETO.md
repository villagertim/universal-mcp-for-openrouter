# Implementation Plan: OpenCode OpenRouter Pareto Tiers & Agent Workflow

## Resolution

**Phase 1 Gate: FAILED.** OpenCode v1.15.3 has no plugin hook for transforming provider requests. A confirmed open bug (#27361) confirms model-level `options` are silently dropped for OpenRouter providers. `@openrouter/ai-sdk-provider` cannot inject `plugins` arrays from config. No client-side path exists to attach Pareto settings per-request.

**Revised approach adopted:** OpenRouter service-level (workspace) Pareto defaults. Three services within one account, each configured with a different Pareto tier default, each with its own API key. OpenCode registers each as a separate provider. Server-side Pareto routing handles model selection within each quality band.

## Objective

Select three Pareto-optimized quality tiers (`pareto-low`, `pareto-med`, `pareto-high`) as distinct models in OpenCode, with Pareto optimizing for the cheapest model that meets each tier's quality threshold. No proxy, no plugin, no client-side request transformation.

`chat_ensemble` remains an MCP tool.

## Architecture

```
One OpenRouter account
├── Service: Pareto-Low   → Pareto default: Low   → API key → env OPENROUTER_PARETO_LOW_KEY
├── Service: Pareto-Medium → Pareto default: Medium → API key → env OPENROUTER_PARETO_MED_KEY
└── Service: Pareto-High   → Pareto default: High   → API key → env OPENROUTER_PARETO_HIGH_KEY

OpenCode
├── pareto-low provider   ──→ Pareto-Low service   ──→ openrouter/pareto-code (low quality band)
├── pareto-med provider   ──→ Pareto-Medium service ──→ openrouter/pareto-code (medium quality band)
└── pareto-high provider  ──→ Pareto-High service   ──→ openrouter/pareto-code (high quality band)
```

## Agent Defaults

| Agent | Default model | Permissions |
|---|---|---|
| `planner` | `pareto-high/pareto-high` | Read-only by default; model overridable manually |
| `implementer` | `pareto-med/pareto-med` | Editing allowed per existing policy; model overridable manually |
| `reviewer` | `pareto-high/pareto-high` | Read-only |
| `utility` | `pareto-low/pareto-low` | Read-only |
| `validator` | `pareto-med/pareto-med` | Deterministic validation where possible; model overridable manually |

Global default: `pareto-med/pareto-med` (Pareto Medium).
`small_model`: `pareto-low/pareto-low` for session titles and compaction.

Defaults must be manually overridable.

## Phase 1: Plugin Feasibility Gate — RESOLVED

**Outcome:** FAILED — no viable path. See resolution above.

Investigation findings:
- OpenCode v1.15.3 plugin system has no request-level hooks for provider body transformation
- `@openrouter/ai-sdk-provider` cannot inject `plugins: [{id: "pareto-router", ...}]` from config
- Bug #27361 confirms model-level `options` are silently dropped for OpenRouter and `@ai-sdk/openai-compatible` providers
- `transformRequestBody` exists in `@ai-sdk/openai-compatible` but OpenCode does not wire it

## Phase 2: OpenRouter Service Configuration — COMPLETED

User created three OpenRouter services with Pareto defaults configured via dashboard:

- Pareto-Low: `min_coding_score < 0.33`
- Pareto-Medium: `min_coding_score >= 0.33, < 0.66`
- Pareto-High: `min_coding_score >= 0.66`

Each service has its own API key.

## Phase 3: OpenCode Provider Configuration — COMPLETED

Deployed to `~/.config/opencode/opencode.jsonc`:

- Three Pareto providers (`pareto-low`, `pareto-med`, `pareto-high`) using `@ai-sdk/openai-compatible`, each pointing to `https://openrouter.ai/api/v1` with its service-specific API key from environment variables
- Existing `local_litellm` provider preserved
- Agent configs with per-agent model defaults and permissions
- `reviewer` and `utility` agents set to read-only

## Phase 4: Environment Variables — PENDING

User needs to add three API keys to shell environment:

```
export OPENROUTER_PARETO_LOW_KEY="sk-or-v1-..."
export OPENROUTER_PARETO_MED_KEY="sk-or-v1-..."
export OPENROUTER_PARETO_HIGH_KEY="sk-or-v1-..."
```

Target: `~/.bashrc` or equivalent shell profile for persistence system-wide.

## Phase 5: MCP Server Integration — COMPLETED

OpenRouter MCP server added to `~/.config/opencode/opencode.jsonc`:

- `chat_ensemble` — multi-model consensus
- `chat_routed` — cost-aware routing
- Budget controls (`set_budget`, `get_budget_status`)
- Model inspection tools
- `TOOLS_PROFILE`: `opencode` (disables redundant code tools, keeps chat/model/budget/context/verify tools)

Existing `litellm-tim` and `litellm-chrisann` MCP servers preserved.

## Phase 6: Phase-Based Planning Rules — PENDING

Rules to be added to `AGENTS.md` or equivalent:
- Each implementation plan phase includes a model recommendation
- Recommendation format: tier, rationale, risks, alternatives, escalation conditions
- Token-aware phase sizing (do not create phases just for model re-evaluation)
- Two-repair-attempt limit before escalation

## Phase 7: Controlled Evaluation — PENDING

Bake-off with the complete setup:

Test categories:
1. Repository comprehension
2. Reproducible bug fix
3. Multi-file feature
4. Test creation
5. Code review
6. Security-sensitive analysis
7. Failed-validation repair

Compare: Pareto Medium vs Pareto High vs Pareto Low for appropriate task categories.

Record: requested tier, concrete model returned, token usage, cost, tool calls, approval prompts, test results, corrections, repair-loop behavior.

## Phase 8: Session Stickiness Validation — PENDING

Verify:
- Whether Pareto keeps the same underlying model during one implementation phase
- Whether OpenRouter routing metadata is accessible
- Whether model changes between phases are visible and auditable

## Phase 9: Documentation — PENDING

Document:
- Available Pareto tiers and their effective coding score bands
- Agent defaults with override workflow
- Phase recommendation format
- Token-aware planning policy
- Environment variable requirements
- MCP vs. provider responsibilities

## Next Step

User adds the three API keys to environment variables, restarts OpenCode, and verifies all three Pareto tiers appear in `/models`. Then proceed to Phase 6 (rules) and Phase 7 (evaluation).
