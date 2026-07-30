# Tech Debt — Universal MCP for OpenRouter

Items that must be addressed before public release. This file is a living document.

---

## Pre-Release Blockers

### ✅ #1 — GitHub Repository URL

Done (May 2026). All repository placeholders, links, and package metadata are fully updated to point to `https://github.com/tim/universal-mcp-for-openrouter`.

---

### ✅ #2 — Rename `USER_MANUAL_DRAFT.md` to `USER_MANUAL.md`

Done (Apr 2026). Renamed to `USER_MANUAL.md` and stamped as Revision 0.9.

---

### ✅ #3 — Update `package.json` Metadata

Done (Apr 2026). Updated `name` to `universal-mcp-for-openrouter` and added all missing metadata fields.

---

### ✅ #4 — OpenRouter Trademark Disclaimer in README

Done (May 2026). Added official trademark notice section to the bottom of `README.md` and prefixed subtitle with "An unofficial," in alignment with branding rules.

---

### ✅ #5 — Verify All Model Examples Are Current

Verified against the live OpenRouter catalog on **July 29, 2026**. Refreshed stale runtime defaults, static fallbacks, and public examples; added regression coverage for preset and fallback IDs. Model availability changes frequently, so re-verify before release by running `list_models`.

Files containing model references:
- `USER_MANUAL.md` — Chapters 2, 4, 5, 11, 14
- `README.md` — Example usage section

---

## Known Improvements

| # | Item | Category | Priority | Notes |
|---|---|---|---|---|
| 6 | **Add "Hello World" verification step** | Documentation | ✅ Done (May 2026) | Implemented the custom server diagnostics tool (`verify_setup`). |
| 7 | **Screenshots for setup instructions** | Documentation | Low | Peer review recommended platform-specific screenshots for Node.js and environment variable setup. |
| 8 | **Companion troubleshooting guide** | Documentation | Low | Peer review suggested a standalone troubleshooting document beyond Chapter 12. |
| 9 | **Scalable Semantic Storage (Option F)** | Performance | 🟡 Recommended | Outlined a modular VectorStore provider architecture to support local SQLite tables or pgvector / ChromaDB databases once chunks > 10,000. See the detailed design in the [scalable-semantic-storage.md](file:///home/tim/dev/projects/openrouter-mcp/blueprints/scalable-semantic-storage.md) blueprint. |
| 10 | **Headless CI/CD PR Review (Option G)** | Code Quality | Low | Introduces structured JSON reviews (`{ approve: boolean, issues[] }`) to audit Git diffs automatically in silent CI/CD pipelines. |

---

## Pre-Publication Cleanup

Items that should be resolved before announcing the project publicly.

| # | Item | Status | Notes |
|---|---|---|---|
| 9 | **Fix 3 failing test mocks** | ✅ Done (Apr 2026) | Fixed mock paths in context, budget, and code_intelligence tests. |
| 10 | **Rename `USER_MANUAL_DRAFT.md` → `USER_MANUAL.md`** | ✅ Done (Apr 2026) | Renamed to USER_MANUAL.md and stamped as Revision 0.9. |
| 11 | **Update preset model IDs in `src/config.ts`** | ✅ Done (Jul 2026) | Refreshed all stale runtime presets, static fallback tiers, router backup IDs, and public examples against live catalog; added presets.test.ts regression coverage. |
| 12 | **Publish to npm** | 🟡 Recommended | Needed so users can `npx` install without cloning. Decide on package name: `universal-mcp-for-openrouter` or similar. |

---

## Outreach & Publication

Steps to make the project discoverable after all blockers are resolved.

### Phase 1 — Foundation (Do First)

| # | Action | Channel | Status |
|---|---|---|---|
| 13 | **Create public GitHub repository** | GitHub | 🔴 Not started |
| 14 | **Publish npm package** | npm registry | 🔴 Not started |
| 15 | **Write README for GitHub** | Repository | 🟡 Current README needs update for public audience |

### Phase 2 — Community Visibility

| # | Action | Channel | Status |
|---|---|---|---|
| 16 | **Post in OpenRouter Discord** | `#showcase` or `#community` channel | ⬜ Pending Phase 1 |
| 17 | **Submit to MCP Server Directory** | MCP ecosystem directory (if exists) | ⬜ Pending Phase 1 |
| 18 | **Submit to OpenRouter's integrations/community page** | OpenRouter website | ⬜ Pending Phase 1 |

### Phase 3 — Broader Awareness

| # | Action | Channel | Status |
|---|---|---|---|
| 19 | **Contact OpenRouter team directly** | Email or Discord DM | ⬜ Pending Phase 2 |
| 20 | **Post on relevant dev communities** | Reddit (r/LocalLLaMA, r/ChatGPT), Hacker News, dev.to | ⬜ Pending Phase 2 |
| 21 | **List on awesome-mcp or similar curated lists** | GitHub awesome lists | ⬜ Pending Phase 2 |

---

## Notes

- This file should be reviewed before each release candidate.
- Items marked 🔴 are blockers; items marked 🟡 are recommended but not blocking.
- Items marked ⬜ are sequentially dependent on earlier phases.
- Once an item is resolved, move it to a "Completed" section at the bottom with the date.

---

## Completed Remediation (July 2026)

| Item | Summary | Date |
|---|---|---|
| Phase 1 — Retry-After unit fix | Corrected `retry-after` (RFC 7231 seconds) vs `retry-after-ms` parsing; surfaced swallowed init-load errors; added lock-in test for token-bucket wait. | 2026-07-29 |
| Phase 2 — Commit in-flight refactor | Tracked `AGENTS.md`, domain orchestrator, native resources/prompts, and 7 new test files. | 2026-07-29 |
| Phase 3 — Model ID staleness sweep | Refreshed all runtime presets, synthetic defaults, static fallback tiers, vision default, and public examples against live OpenRouter catalog. Added `presets.test.ts`. | 2026-07-29 |
| Phase 4 — Domain type safety | Added `Tool`/`ToolModule`/`ToolHandler` interfaces; enabled `noUncheckedIndexedAccess`; fixed ~45 null-access errors across 7 files. | 2026-07-29 |
| Phase 5 — Polish | Made `USER_ENV_PATH` configurable via `OPENROUTER_MCP_ENV_PATH`; updated TECH_DEBT; guarded stdout redirect. | 2026-07-29 |
