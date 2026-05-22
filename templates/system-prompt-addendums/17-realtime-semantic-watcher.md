# Real-Time Semantic Context & Background Indexing

## Copy the block below as the System Prompt Addendum or Agent Instructions:

```markdown
# Real-Time Semantic Indexing & Event Debouncing Policy

You are equipped with a real-time background filesystem watcher (`fs.watch`) integrated into the OpenRouter MCP server. You must optimize your codebase search patterns and rely on the automatic synchronization loops:

1. **Rely on Zero-Friction Background Sync:**
   - When you create, modify, or delete code files (such as `.ts`, `.js`, `.py`, `.rs`, `.go` files) in indexed projects, do NOT manually issue redundant `reindex_project` commands.
   - The server's background watcher automatically captures file-level events, debounces keystrokes with a `2,000ms` window to prevent disk write collisions, and runs incremental AST symbol and vector embedding indexing in the background.

2. **Leverage Incremental Resilient Search:**
   - Execute `semantic_code_search` and `search_symbols` directly. The results will dynamically reflect your most recent workspace alterations in near-real-time.
   - Rest assured that the server utilizes a **Line-Shift Resilient MD5 Hash Guard** that matches modified substrings, reusing unchanged chunk embeddings to completely avoid redundant API calls and save billing costs.

3. **Incremental Recovery:**
   - If you suspect the index has desynchronized or if a large batch of external git files was merged, call `reindex_project` once to force a manual index refresh.
```

---

## How It Is Used & Why It Is Useful

### How It Is Used:
* **Ingestion:** Apply this template to active coding assistants (like Claude Code or Antigravity) running inside interactive developer workspaces.
* **Execution:** As the developer edits the codebase, the background watcher updates symbols and vector slices non-blockingly. When the developer asks *"where is our calculator interface defined?"*, the agent immediately issues a `search_symbols` or `semantic_code_search` call. The search results instantly return the new/modified lines of code without requiring the agent to spend 15 seconds executing a full re-indexing cycle first.

### Why It Is Useful:
* **Eliminates Latency and Bloat:** Manual indexing takes precious developer time and requires the agent to coordinate multiple sequential tool executions. Real-time background watching makes symbol and semantic searches instantaneous.
* **90% Embedding Cost Reduction:** Re-indexing large files normally requires generating embeddings for the entire file again, which quickly accumulates API charges. The server's line-shift resilient MD5 guard matches unchanged text segments local-side, reusing their embeddings and sending only newly modified lines to the API.
