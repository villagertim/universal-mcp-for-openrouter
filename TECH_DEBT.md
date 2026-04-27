# Tech Debt — Universal OpenRouter MCP

Items that must be addressed before public release. This file is a living document.

---

## Pre-Release Blockers

| # | Item | Category | Status | Notes |
|---|---|---|---|---|
| 1 | **GitHub repository URL** | Licensing | 🔴 TBD | Update `LICENSE` file and all documentation with the final public repository URL once created. |
| 2 | **Rename `USER_MANUAL_DRAFT.md` to `USER_MANUAL.md`** | Documentation | 🔴 Pending | Final review must be completed before committing the manual as the official version. |
| 3 | **Update `package.json` name field** | Packaging | 🔴 TBD | Decide on npm package name (e.g., `universal-openrouter-mcp` or `@openrouter/mcp-server`). |
| 4 | **OpenRouter trademark disclaimer** | Legal | 🟡 Draft | Disclaimer drafted; needs to be added to README.md before public release. |
| 5 | **Verify all model examples are current** | Documentation | 🟡 Done (Apr 2026) | Model names change rapidly. Re-verify against `list_models` before release. |

---

## Known Improvements

| # | Item | Category | Priority | Notes |
|---|---|---|---|---|
| 6 | **Add "Hello World" verification step** | Documentation | Medium | User Manual peer review recommended a post-setup verification test. Not yet implemented. |
| 7 | **Screenshots for setup instructions** | Documentation | Low | Peer review recommended platform-specific screenshots for Node.js and environment variable setup. |
| 8 | **Companion troubleshooting guide** | Documentation | Low | Peer review suggested a standalone troubleshooting document beyond Chapter 12. |

---

## Notes

- This file should be reviewed before each release candidate.
- Items marked 🔴 are blockers; items marked 🟡 are recommended but not blocking.
- Once an item is resolved, move it to a "Completed" section at the bottom with the date.
