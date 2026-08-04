# Post-Action Debrief: OpenRouter Pareto Integration for OpenCode

**Date:** 2026-08-04
**Repository:** `villagertim/universal-mcp-for-openrouter`
**OpenCode version:** 1.15.3

## What We Did

1. Cleared stale scratch scripts (10 files, 58KB) with outdated model IDs and hardcoded author paths (`file:///home/tim/...`). Committed `e718780`.

2. Resolved 5 Dependabot vulnerabilities (fast-uri, hono, ip-address) with a 9-line `npm audit fix --package-lock-only` diff. Closed three Dependabot PRs (#5, #6, #7) as superseded. Committed `3252a95`.

3. Set out to integrate OpenRouter Pareto tiers (`pareto-low`, `pareto-medium`, `pareto-high`) as selectable models in OpenCode, with Pareto optimizing model selection within each quality band. The goal was "best model for the job at the best price" — Pareto's dynamic routing per quality tier, not fixed model assignments.

## Why We Did It

**Context:** OpenCode was using LiteLLM proxy local models for everything. OpenRouter offers Pareto Code routing that picks the cheapest strong coding model above a configurable quality threshold. The conversation on `~/test.md` recommended three practical tiers: Low (mechanical chores), Medium (routine development), and High (architecture/security/review). Exposing these as selectable models would let agents dynamically choose the right quality-vs-cost balance per implementation phase.

## What Failed

**Original plan: OpenCode plugin → request transformation.** The plugin system has hooks for tool calls and shell commands, but zero hooks for intercepting or modifying outgoing LLM provider requests. `@opencode-ai/plugin@1.18.13` confirms the type surface. A confirmed open bug (anomalyco/opencode#27361) confirms model-level `options` are silently dropped for OpenRouter providers.

**Also tried:** `@ai-sdk/openai-compatible` `transformRequestBody`, `providerOptions` passthrough, custom fetch interceptors. None are accessible from OpenCode JSON config. All require runtime code injection that OpenCode doesn't support from config alone.

## What Worked

**OpenRouter workspace-based tiers.** OpenRouter services (workspaces) within a single account can each have their own API key and independent Pareto plugin defaults. Three services (Pareto-Low, Pareto-Medium, Pareto-High), each with its own Pareto tier configured server-side. OpenCode registers each as a separate `@ai-sdk/openai-compatible` provider. Three selectable models. Zero client-side code. Zero request transformation. Zero plugins.

The Pareto routing happens entirely on OpenRouter's side — the client simply sends `model: "openrouter/pareto-code"` and the service-level default determines the coding score band.

## What Was Deployed

`~/.config/opencode/opencode.jsonc`:
- Three Pareto providers (`pareto-low`, `pareto-med`, `pareto-high`)
- Agent defaults: planner→pareto-high, implementer→pareto-med, reviewer→pareto-high (read-only), utility→pareto-low (read-only), validator→pareto-med
- OpenRouter MCP server attached for `chat_ensemble`, `chat_routed`, and budget controls
- Existing `local_litellm` provider and `litellm-tim`/`litellm-chrisann` MCP servers preserved

## Remaining Work

- User adds three API keys to `~/.bashrc` (`OPENROUTER_PARETO_LOW_KEY`, `OPENROUTER_PARETO_MED_KEY`, `OPENROUTER_PARETO_HIGH_KEY`)
- Define phase-based planning rules in `AGENTS.md` (recommendation format, token-aware phase sizing, repair limits)
- Run controlled bake-off comparing Pareto tiers against each other on real coding tasks
- Validate session stickiness (whether Pareto keeps the same model during one phase)
- Document results

## Lessons Learned

1. **Always verify plugin API surfaces before designing around them.** OpenCode's plugin system is designed for tool interception and shell customization, not provider request transformation. We assumed a hook existed that didn't, and the architecture depended on it.

2. **Read the provider source, not just the docs.** The OpenCode source code (`provider.ts`, `transform.ts`, `provider-options.ts`) revealed the exact wiring between config fields and API requests. The model-level options bug (#27361) and the `@openrouter/ai-sdk-provider` lowerer path were only discoverable in source, not documentation.

3. **Server-side routing > client-side injection when available.** OpenRouter's service-level Pareto defaults eliminated the need for any client-side request modification. What seemed like a limitation (can't inject `plugins` from the client) became irrelevant because the server already had the configuration path we needed.

4. **Stop condition discipline matters.** We agreed early: "stop if plugin route is unavailable — no proxy, no MCP impersonation." Enforcing that prevented wasted effort on proxy infrastructure for what turned out to be a configuration-only problem.

5. **Services (workspaces) within one account are lighter than separate accounts.** The initial fear of "three accounts" was unnecessary — OpenRouter supports multiple services with independent defaults under one billing account. Setup was purely dashboard configuration, not account management.

6. **The Pareto coding score is a three-position switch disguised as a dimmer.** Values 0.33–0.659 all map to Medium; 0.66+ maps to High. Precise decimal tuning is placebo. The tier selection matters more than the exact number.

7. **ChatGPT shared links are not fetcher-accessible.** We wasted time trying to fetch `chatgpt.com/share/...` URLs that render only as JS shell pages to automated tools. Copy/paste is more reliable.
