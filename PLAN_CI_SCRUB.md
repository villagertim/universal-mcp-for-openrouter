# Implementation Plan: CI/CD Workflow & Scratch Cleanup

## Phase A: CI/CD Workflow (~1 hr) ✅ COMPLETED

**A1 — Created `.github/workflows/ci.yml`**

One `build-and-test` job with checkout@v4, setup-node@v4 (node-version-file: .nvmrc), `npm ci`, `npm run build`, `npm test`. Runs on `push` and `pull_request` to `main`.

**A2 — Verified**
CI run #1 (ID 30898761273) succeeded in 18s. Committed as `e94bcd1`.

---

## Phase B: `scratch/` Cleanup (~1 hr)

10 files, 58KB total. All have stale model IDs (`gemini-1.5-pro`, `claude-3-5-haiku`, `qwen-3.6-flash`) and hardcoded author paths (`file:///home/tim/...`).

**B1 — Delete all 10 files:**

| File | Size | Type |
|---|---|---|
| `test-failover.mjs` | 5.9KB | Manual integration test |
| `test-ensemble.mjs` | 9.4KB | Manual integration test |
| `test-router.mjs` | 7.0KB | Manual integration test |
| `test-watcher.mjs` | 11.2KB | Manual integration test |
| `test-transitive.mjs` | 10.7KB | Manual integration test |
| `test-symbolic-paths.mjs` | 1.8KB | Manual test |
| `peer-review.mjs` | 4.7KB | Design proposal script |
| `peer-review-option-e.mjs` | 3.4KB | Design proposal script |
| `peer-review-report.md` | 3.9KB | Design document |
| `peer-review-report-option-e.md` | 4.4KB | Design document |

**Retention evaluation (2026-08-04):** None retained. All scripts import from `build/` or hardcoded author paths, use `process.exit()` in lieu of test framework, and are outside CI. However the *scenarios* covered by six of the ten files (ensemble, router, failover, transitive, watcher, path-utils) are worth porting as new Vitest tests in a future PR. The two peer-review scripts and two reports are design artifacts for already-implemented features and are not worth retaining.

**B2 — Commit** with message `chore: remove stale scratch/ scripts with outdated model IDs and author paths`.