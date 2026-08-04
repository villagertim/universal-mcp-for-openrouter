# Implementation Plan: Dependabot Vulnerability Remediation

## Context

GitHub reports **5 open Dependabot alerts** (2 high, 3 moderate) on `main`. All are transitive dependencies pulled in through `@modelcontextprotocol/sdk@1.30.0` (already the latest SDK release). Three open Dependabot PRs exist, one per affected package.

## Vulnerability Inventory

| # | Severity | Package | Current | Patched | GHSA | Vector |
|---|---|---|---|---|---|---|
| 8 | **high** | `fast-uri` | 3.1.4 | 3.1.5 | GHSA-7p8r-x3mc-p8w7 | host confusion via backslash authority |
| 9 | **high** | `ip-address` | 10.2.0 | 10.3.1 | GHSA-mwp4-54f8-5fhr | leading-zero octet SSRF bypass |
| 6 | medium | `ip-address` | 10.2.0 | 10.2.1 | GHSA-22jq-vg5j-6vgg | IPv4-mapped/NAT64 misclassification |
| 7 | medium | `ip-address` | 10.2.0 | 10.2.2 | GHSA-4xrf-jv44-h6hh | CIDR suffix special-use bypass |
| 10 | medium | `hono` | 4.12.27 | 4.12.34 | GHSA-8j4g-w8fx-2239 | ReDoS in CORS middleware |

Target versions (satisfy all alerts): `fast-uri@3.1.5`, `ip-address@10.4.0`, `hono@4.13.0`.

## Dependency Chains

```
@modelcontextprotocol/sdk@1.30.0
├─┬ @hono/node-server@2.0.12 → hono@4.12.27
├─┬ hono@4.12.27 (direct SDK dep)
├─┬ ajv@8.20.0 → fast-uri@3.1.4
└─┬ express-rate-limit@8.5.2 → ip-address@10.2.0
```

All three are transitive; none appear in `package.json` dependencies. The SDK is already at its latest published version (1.30.0), so no SDK bump is available to pull fixed versions transitively.

## Existing Dependabot PRs

| PR | Branch | Bump |
|---|---|---|
| #5 | `dependabot/npm_and_yarn/ip-address-10.4.0` | ip-address 10.2.0 → 10.4.0 |
| #6 | `dependabot/npm_and_yarn/fast-uri-3.1.5` | fast-uri 3.1.4 → 3.1.5 |
| #7 | `dependabot/npm_and_yarn/hono-4.13.0` | hono 4.12.27 → 4.13.0 |

## Approach Analysis

**Option 1 — Merge the 3 Dependabot PRs.** Each PR bumps one package. Three separate merges; each triggers CI. Risk: PRs were generated against an older `main` lockfile (before `e718780`) and may conflict with each other since all touch `package-lock.json`. Requires checking mergeability and likely rebasing sequentially.

**Option 2 — Single `npm audit fix --package-lock-only` commit.** Verified empirically: resolves all 5 alerts in one 9-line lockfile diff (3 version/resolved/integrity triplets). No `package.json` change, no `overrides` needed, no node_modules bloat (the 29 optional native-binding packages the interactive `npm audit fix` proposes are already in the lockfile as `optional:true` and are platform-omitted — they do not appear in the `--package-lock-only` diff). Build passes; all 64 tests pass. Then close the 3 Dependabot PRs as superseded.

**Option 3 — `package.json` `overrides`.** Adds an `overrides` block forcing the 3 versions. Works but is heavier than needed (mutates `package.json`, pins versions the SDK doesn't require, leaves `overrides` to maintain). Only justified if the SDK later tries to pull old versions back; npm's dedupe already prefers the patched versions once in the lockfile.

## Recommended Approach: Option 2

Minimal blast radius, single commit, empirically validated. The lockfile currently already contains the fix (uncommitted, from the investigation); revert if a clean re-application is preferred.

## Phase A — Apply the lockfile fix

**A1 — (if needed) restore and re-apply cleanly**
```
git checkout -- package-lock.json
npm audit fix --package-lock-only
```
Verify `npm audit` reports 0 vulnerabilities.

**A2 — Verify**
```
npm run build && npm test
```
Confirm build succeeds and 64/64 tests pass.

**A3 — Commit**
```
git add package-lock.json
git commit -m "chore(deps): fix fast-uri, hono, ip-address vulnerabilities (GHSA-7p8r, GHSA-8j4g, GHSA-mwp4, GHSA-4xrf, GHSA-22jq)"
git push
```

## Phase B — Close superseded Dependabot PRs

After Phase A lands on `main` and Dependabot re-scans:
**B1 — Close PRs #5, #6, #7** with a comment: "Superseded by commit <SHA> which bumps all three packages in a single lockfile update."
**B2 — Delete the remote Dependabot branches** (`dependabot/npm_and_yarn/{ip-address-10.4.0,fast-uri-3.1.5,hono-4.13.0}`) if not auto-deleted.
**B3 — Confirm** the 5 alerts move to `dismissed`/`fixed` in the GitHub Security tab (Dependabot auto-detects on next scan; may take a few minutes).

## Sequencing

```
Phase A (lockfile fix + commit + push) ──► Phase B (close PRs, confirm alerts clear)
```

## Risks / Notes

- The 29 "added packages" reported by interactive `npm audit fix` (without `--package-lock-only`) are optional native bindings from `vitest@4.1.5 → vite@8.1.0` (lightningcss, @rolldown/*, fsevents). They are already present in the lockfile as `optional:true` and do NOT appear in the `--package-lock-only` diff. No action needed.
- `ip-address@10.4.0` satisfies all three ip-address advisories (10.2.1, 10.2.2, 10.3.1).
- If a future SDK release (e.g. 1.31.x) regresses these versions, revisit and consider Option 3 (`overrides`).
- The `pre-commit` secret-scan hook is unaffected (lockfile changes contain no secrets).
