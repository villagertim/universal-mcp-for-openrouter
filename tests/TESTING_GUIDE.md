# Testing Guide — Universal MCP for OpenRouter

This guide explains how to run, verify, and contribute tests for each platform profile. The goal is to make it easy for anyone to validate the MCP server on their specific agentic AI coding platform and contribute their results back.

---

## Quick Start: Run the Full Test Suite

```bash
# Clone the repository
git clone https://github.com/[TBD]/universal-mcp-for-openrouter.git
cd universal-mcp-for-openrouter

# Install dependencies
npm install

# Run all tests (all profiles)
npm test
```

This runs all test files across all profile subdirectories using [Vitest](https://vitest.dev/).

---

## Running Tests for a Specific Profile

To run only the tests for one profile:

```bash
# Antigravity tests only
npx vitest run tests/antigravity/

# Claude Code tests only (when available)
npx vitest run tests/claude-code/

# Codex tests only (when available)
npx vitest run tests/codex/

# Opencode tests only (when available)
npx vitest run tests/opencode/

# Generic tests only (when available)
npx vitest run tests/generic/
```

### Running a Single Test File

```bash
npx vitest run tests/antigravity/chat.test.ts
```

### Running in Watch Mode (for development)

```bash
npx vitest watch tests/antigravity/
```

---

## Test Directory Structure

```
tests/
├── antigravity/              ✅ Tested and verified by maintainer
│   ├── account.test.ts       — Account management (get_balance, get_key_info)
│   ├── budget.test.ts        — Budget and rate limiting (set_budget, get_budget_status)
│   ├── chat.test.ts          — Chat tools (chat_completion, chat_with_preset, recommend_model)
│   ├── code_intelligence.test.ts — Code indexing and search
│   ├── context.test.ts       — Memory tools (pin_context, retrieve_context, clear_context)
│   ├── models.test.ts        — Model listing and session usage
│   ├── performance.test.ts   — Concurrency and cold-start timing
│   ├── security.test.ts      — Credential isolation and path sanitization
│   └── vision.test.ts        — Image analysis (vision_analyze)
│
├── claude-code/              ⚠️ Not yet tested — contributions welcome
│   └── README.md
├── codex/                    ⚠️ Not yet tested — contributions welcome
│   └── README.md
├── opencode/                 ⚠️ Not yet tested — contributions welcome
│   └── README.md
└── generic/                  ⚠️ Not yet tested — contributions welcome
    └── README.md
```

---

## What Each Test Category Verifies

| Test File | Tools Covered | What It Proves |
|---|---|---|
| `chat.test.ts` | `chat_completion`, `chat_with_preset`, `recommend_model`, `optimize_prompt` | Chat round-trips work, presets route correctly, prompt optimization returns results |
| `models.test.ts` | `list_models`, `get_session_usage` | Model catalog loads, session token/cost tracking increments correctly |
| `account.test.ts` | `get_balance`, `get_key_info` | Account credit and API key metadata are returned correctly |
| `vision.test.ts` | `vision_analyze` | Local file base64 encoding and URL-based analysis work |
| `context.test.ts` | `pin_context`, `retrieve_context`, `clear_context` | Data persists, search retrieval works, deletion works |
| `code_intelligence.test.ts` | `index_project`, `search_symbols`, `reindex_project`, `semantic_code_search` | Symbol extraction, cross-project search, and semantic retrieval work |
| `budget.test.ts` | `set_budget`, `get_budget_status` | Budget limits block overspend, warnings trigger at threshold |
| `security.test.ts` | (infrastructure) | API keys aren't leaked in logs, path traversal is blocked |
| `performance.test.ts` | (infrastructure) | 5+ concurrent requests don't crash, cold start < 500ms |

---

## Contributing Tests for a New Profile

### Step 1: Understand What Your Profile Enables

Check the profile JSON file in `profiles/[your-profile].json` to see which tools are `true` (enabled). **You only need to test enabled tools.**

For example, if `claude-code.json` has `vision_analyze: true` but `index_project: false`, you should:
- ✅ Include `vision.test.ts`
- ❌ Skip `code_intelligence.test.ts`

### Step 2: Copy Relevant Test Files

```bash
# Example: Setting up Claude Code tests
cd tests/claude-code

# Copy the test files for tools that are ENABLED in the profile
cp ../antigravity/chat.test.ts .
cp ../antigravity/models.test.ts .
cp ../antigravity/account.test.ts .
cp ../antigravity/budget.test.ts .
cp ../antigravity/vision.test.ts .
cp ../antigravity/context.test.ts .
cp ../antigravity/security.test.ts .
cp ../antigravity/performance.test.ts .
# (skip code_intelligence.test.ts — disabled in claude-code profile)
```

### Step 3: Run the Tests

```bash
npx vitest run tests/claude-code/
```

### Step 4: Document Your Results

Update the `README.md` in your profile's test directory with:
- Your platform version (e.g., "Claude Code v1.2.3")
- Date tested
- Pass/fail results for each test file
- Any issues encountered and workarounds

Example:
```markdown
## Test Results — Claude Code Profile

**Platform:** Claude Code v1.2.3
**Date:** May 15, 2026
**Tested by:** @your-github-username

| Test File | Status | Notes |
|---|---|---|
| chat.test.ts | ✅ Passed | |
| models.test.ts | ✅ Passed | |
| account.test.ts | ✅ Passed | |
| budget.test.ts | ✅ Passed | |
| vision.test.ts | ✅ Passed | |
| context.test.ts | ⚠️ 1 failure | clear_context mock issue — see #42 |
| security.test.ts | ✅ Passed | |
| performance.test.ts | ✅ Passed | |
```

### Step 5: Submit a Pull Request

Your PR should include:
1. The test files in `tests/[your-profile]/`
2. Your updated `README.md` with results
3. Any profile JSON changes needed in `profiles/[your-profile].json`

Title format: `test: add verified tests for [platform] profile`

---

## Which Tools Apply to Which Profile?

Use this matrix to know which test files are relevant for each profile:

| Test File | Antigravity | Claude Code | Codex | Opencode | Generic |
|---|---|---|---|---|---|
| `chat.test.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `models.test.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `account.test.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `budget.test.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `vision.test.ts` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `context.test.ts` | ❌ | ✅ | ✅ | ❌ | ✅ |
| `code_intelligence.test.ts` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `security.test.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `performance.test.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## FAQ

**Q: Do I need an OpenRouter API key to run the tests?**
A: No. All tests use mocked API responses. No real API calls are made and no credits are consumed.

**Q: My platform isn't listed. What profile should I test with?**
A: Use `generic` as your starting point. If you find that some tools conflict with your platform's native capabilities, create a custom profile (see `PROFILES.md`).

**Q: I found a bug in an existing test. What should I do?**
A: Open an issue with the test file name, the error output, and your Node.js version (`node --version`).

**Q: The tests pass but the tools don't work in my actual platform. Why?**
A: The tests verify the server's internal logic using mocked data. They don't test the MCP protocol integration with your specific client. If tools don't appear in your client, check that the profile is loaded correctly and your MCP configuration is valid.
