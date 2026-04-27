# Tests — Claude Code Profile

> **Status:** No tests have been created or run for the Claude Code profile.

This directory is a placeholder for future tests specific to the `claude-code` profile. Contributions welcome.

## What Needs Testing

- [ ] Verify that `vision_analyze` works correctly through Claude Code's MCP integration
- [ ] Verify that `pin_context` / `retrieve_context` work as expected (since Claude Code has no native memory)
- [ ] Confirm that disabled tools (`index_project`, `search_symbols`, etc.) do not appear in Claude Code's tool list
- [ ] Run the core test suite (`chat`, `models`, `account`, `budget`) to verify basic functionality

## How to Contribute

1. Copy relevant test files from `tests/antigravity/` as a starting point
2. Adapt for Claude Code's MCP configuration
3. Run and document results
4. Submit a pull request
