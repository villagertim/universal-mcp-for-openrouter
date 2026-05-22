# Profiles — Universal MCP for OpenRouter

Profiles control which tools are enabled or disabled for a specific AI coding platform. The purpose is to **avoid redundancy** — if your platform already has built-in code search, there's no reason to also expose the MCP's `search_symbols` tool.

---

## Testing Status

> **⚠️ Important:** Only the **Antigravity** profile has been tested by the project maintainer. All other profiles are community-contributed best-effort configurations based on publicly known platform capabilities. They may need adjustment for your specific setup.

| Profile | File | Tested? | Status |
|---|---|---|---|
| **Antigravity** | `antigravity.json` | ✅ **Tested** | Production-verified by maintainer |
| **Claude Code** | `claude-code.json` | ❌ Not tested | Based on known Claude Code capabilities |
| **Codex** | `codex.json` | ❌ Not tested | Based on known Codex capabilities |
| **Opencode** | `opencode.json` | ❌ Not tested | Based on known Opencode Native capabilities |
| **Generic** | `generic.json` | ❌ Not tested | All tools enabled — safe fallback |

If you use one of the untested profiles and find that adjustments are needed, we welcome contributions! See "Creating Your Own Profile" below.

---

## How Profiles Work

A profile is a JSON file where each tool name maps to `true` (enabled) or `false` (disabled). When the MCP server starts with a `--profile` flag, it loads the corresponding file from the `profiles/` directory and only registers the tools set to `true`.

**If a tool is not listed in the profile, it defaults to enabled.**

### Using a Profile

Add `--profile` to your MCP server args in your client's configuration:

```json
{
  "mcpServers": {
    "openrouter": {
      "command": "npx",
      "args": ["-y", "@openrouter/mcp-server", "--profile", "antigravity"],
      "env": {
        "OPENROUTER_API_KEY": "your-key-here"
      }
    }
  }
}
```

Replace `antigravity` with any profile name: `claude-code`, `codex`, `opencode`, or `generic`.

---

## Profile Comparison Matrix

This table shows which tools each profile enables (✅) or disables (❌):

| Tool | Antigravity | Claude Code | Codex | Opencode | Generic |
|---|---|---|---|---|---|
| `chat_completion` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `chat_with_preset` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `list_models` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `get_balance` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `get_key_info` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `recommend_model` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `optimize_prompt` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `get_session_usage` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `set_budget` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `get_budget_status` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `correlate_errors` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `dependency_graph` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `vision_analyze` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `index_project` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `search_symbols` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `reindex_project` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `semantic_code_search` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `pin_context` | ❌ | ✅ | ✅ | ❌ | ✅ |
| `retrieve_context` | ❌ | ✅ | ✅ | ❌ | ✅ |
| `clear_context` | ❌ | ✅ | ✅ | ❌ | ✅ |

### Why Each Profile Disables What It Does

**Antigravity** — Disables the most tools because Antigravity has the richest native capabilities: built-in code intelligence (workspace indexing, semantic search), persistent memory (Knowledge Items), and vision.

**Claude Code** — Disables code indexing tools (Claude Code has built-in file search and grep) but keeps memory and vision tools enabled since Claude Code has no native equivalents.

**Codex** — Similar to Claude Code but also disables vision (Codex supports image input natively). Keeps memory tools enabled.

**Opencode** — Disables code indexing (Opencode Native has codebase awareness) and memory tools (Opencode Native has built-in session memory). Keeps vision enabled since Opencode has no native image analysis.

**Generic** — Enables everything. Use this if your platform isn't listed or if you're unsure what your platform provides natively. You can always disable tools later by creating a custom profile.

---

## Creating Your Own Profile

If your platform isn't listed, or if the provided profiles don't match your setup, you can create your own:

### Step 1: Copy the Template

Copy `generic.json` (all tools enabled) as your starting point:

```bash
cp profiles/generic.json profiles/my-platform.json
```

### Step 2: Decide What to Disable

Ask yourself for each tool group:

| Question | If YES, disable... |
|---|---|
| Does my platform have built-in code search / file grep? | `index_project`, `search_symbols`, `reindex_project`, `semantic_code_search` |
| Does my platform have persistent memory across sessions? | `pin_context`, `retrieve_context`, `clear_context` |
| Does my platform support image/vision input? | `vision_analyze` |
| Does my platform have dependency analysis built in? | `dependency_graph` |

### Step 3: Edit the JSON

Set any tool you want to disable to `false`:

```json
{
  "vision_analyze": false,
  "index_project": false,
  "search_symbols": false
}
```

**Tools not listed default to `true`**, so you only need to include the tools you want to change. However, for clarity, we recommend listing all tools explicitly.

### Step 4: Use Your Profile

```json
{
  "mcpServers": {
    "openrouter": {
      "command": "npx",
      "args": ["-y", "@openrouter/mcp-server", "--profile", "my-platform"],
      "env": {
        "OPENROUTER_API_KEY": "your-key-here"
      }
    }
  }
}
```

### Step 5: Contribute It Back (Optional)

If you've created a profile for a popular platform and tested it, we'd love a pull request! Include:
- The profile JSON file
- A brief description of what the platform provides natively
- Whether you've verified it works in practice

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---|---|---|
| Tool not appearing in my assistant | Profile has it set to `false` | Check your profile JSON |
| Tool appears but shouldn't | Profile doesn't include it (defaults to `true`) | Add the tool explicitly with `false` |
| "Profile not found" error | Typo in `--profile` arg or missing file | Verify the file exists in `profiles/` |
| All tools appear despite using a profile | `--profile` arg not being read | Ensure it's in `args`, not `env` |
