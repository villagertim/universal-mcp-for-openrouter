# Agent Handoff

## Repo Identity

- **Name:** `villagertim/universal-mcp-for-openrouter`
- **Purpose:** Universal MCP server for OpenRouter API — multi-model routing, ensemble consensus, budget controls, context indexing
- **Local path:** `/home/cia-one/dev/openrouter-mcp-2`
- **Node:** 22 (`.nvmrc`)
- **Tests:** `npm test` (vitest, 64 tests, 18 files)

## Recently Completed

| Commit | What |
|---|---|
| `3252a95` | Dependabot fix: fast-uri 3.1.4→3.1.5, hono 4.12.27→4.13.0, ip-address 10.2.0→10.4.0 |
| `e718780` | Removed 10 stale `scratch/` scripts |
| `e94bcd1` | Added `.github/workflows/ci.yml` (checkout→build→test) |

## OpenCode Config Deployed

**File:** `~/.config/opencode/opencode.jsonc`

Three Pareto providers using OpenRouter service-level tier defaults:

| Provider | Env var for API key | Coding score | Agent role |
|---|---|---|---|
| `pareto-low` | `OPENROUTER_PARETO_LOW_KEY` | `< 0.33` | utility (read-only) |
| `pareto-med` | `OPENROUTER_PARETO_MED_KEY` | `0.33–0.659` | implementer, validator, default |
| `pareto-high` | `OPENROUTER_PARETO_HIGH_KEY` | `>= 0.66` | planner, reviewer (read-only) |

Global default model: `pareto-med/pareto-med`
Small model: `pareto-low/pareto-low`

Agents:
- `planner` — pareto-high, plan creation with per-phase model recommendations
- `implementer` — pareto-med, execute one approved phase
- `reviewer` — pareto-high, read-only diff review
- `utility` — pareto-low, read-only summaries/searches/classification
- `validator` — pareto-med, deterministic checks

Existing `local_litellm`, `litellm-tim`, and `litellm-chrisann` providers/MCPs preserved.

## MCP Servers

| Server | Source | Tools |
|---|---|---|
| `openrouter-mcp` | This repo (`build/index.js`) | chat_ensemble, chat_routed, budget, context store |
| `litellm-tim` | `/home/cia-one/dev/litellm` | LiteLLM chat tools (port 4001) |
| `litellm-chrisann` | `/home/cia-one/dev/litellm` | LiteLLM chat tools (port 4002) |

OpenRouter MCP uses `TOOLS_PROFILE=opencode` to disable redundant code tools.

## Pending: API Keys

User needs to add three env vars to `~/.bashrc`:

```
export OPENROUTER_PARETO_LOW_KEY="sk-or-v1-..."
export OPENROUTER_PARETO_MED_KEY="sk-or-v1-..."
export OPENROUTER_PARETO_HIGH_KEY="sk-or-v1-..."
```

Each key maps to an OpenRouter service (workspace) with Pareto configured server-side at the corresponding tier. Keys are available from OpenRouter dashboard → Services.

After setting, restart OpenCode and verify with `/models`.

## Remaining Work

1. **AGENTS.md rules** — Add phase-based planning rules:
   - Each plan phase must include model recommendation (tier + rationale + risks + alternatives)
   - Token-aware phase sizing (group related work, no phases just for model re-evaluation)
   - Two-repair-attempt limit, then escalate
   - Planner uses pareto-high, implementer uses pareto-med, reviewer uses pareto-high (read-only)
   - User selects or overrides model before authorizing each phase

2. **Bake-off evaluation** — Compare Pareto tiers on real coding tasks:
   - Repository comprehension
   - Bug fix with failing test
   - Multi-file feature
   - Test creation
   - Code review (planted defects)
   - Security analysis
   - Failed-validation repair
   - Record: requested tier, actual model returned, tokens, cost, tool calls, human corrections

3. **Session stickiness validation** — Confirm Pareto keeps the same underlying model during one conversation/phase

## Why Architecture = Workspace-Based (Not Plugin)

OpenCode v1.15.3 plugins have no provider request hooks. Model-level `options` are dropped (bug #27361). Client-side Pareto injection is impossible without a proxy or code modification. OpenRouter services (workspaces) solve this server-side: each service has independent Pareto defaults + API key, registered as separate providers in OpenCode. No proxy. No plugins. No code.

## Key Files

| File | Purpose |
|---|---|
| `~/.config/opencode/opencode.jsonc` | Deployed config with Pareto providers, agents, MCPs |
| `PLAN_OPENCODE_PARETO.md` | Full implementation plan (10 phases, current status) |
| `DEBRIEF_PARETO.md` | Post-action debrief with lessons learned |
| `PLAN_DEPENDABOT_REMEDIATION.md` | Dependabot fix plan (completed) |
| `PLAN_CI_SCRUB.md` | CI + scratch cleanup plan (completed) |
| `src/tools/chat.ts` | chat_completion, chat_ensemble, chat_routed handlers |
| `src/helpers/router.ts` | RouterEngine — cost/quality model selection |
| `src/helpers/rate-guard.ts` | Budget, circuit breaker, failover logic |
| `src/config.ts` | Presets, rate defaults, data paths |
| `profiles/opencode.json` | Tool enable/disable profile for OpenCode |
| `tools.config.json` | Global tool enable/disable config |

## Constraints

- No `~author/family-latest` aliases — pinned concrete model IDs only
- `pareto-low` is read-only (permissions, not just instruction)
- No proxy, no MCP provider impersonation
- User controls model selection per phase; agent only recommends
- Token-aware: don't spend more tokens recommending a model than the switch would save
- `chat_ensemble` is an MCP tool, never a model alias
- `bodybuilder` and `fusion` are available but not the current focus
