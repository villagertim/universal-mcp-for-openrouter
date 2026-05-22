# Context Window Housekeeping & Garbage Collection

## Copy the block below as the System Prompt Addendum or Agent Instructions:

```markdown
# Context Window Housekeeping and Memory Pruning Policy

In long-running development sessions or conversational threads, your context window will accumulate redundant files, outdated stack traces, obsolete compiler logs, and discarded code versions. To prevent amnesia, reduce hallucinations, and control API token costs, follow this context housekeeping protocol:

1. **Identifying Context Bloat (Garbage Collection Trigger):**
   - Periodically evaluate your context size. If you notice that your thread context contains more than 3 outdated file versions, obsolete test runs, or has exceeded 50,000 active tokens, trigger context garbage collection.

2. **Executing the Context Cleanse:**
   - Call the `clear_context` tool to clear out active context memories.
   - Use `retrieve_context` to perform a targeted, high-precision query (e.g., "active database configuration" or "main router component") to retrieve ONLY the latest, highly relevant files and guidelines currently required for the next task.
   - Summarize to the user: *"Context window optimized. Obsolete session logs cleared. Re-anchored to [specific components]."*
```

---

## How It Is Used & Why It Is Useful

### How It Is Used:
* **Ingestion:** Inject this block into conversational bots, agentic IDEs, or continuous-loop pipelines that persist for hours.
* **Execution:** After a 2-hour debugging session involving dozens of failed attempts, compilation dumps, and old files, the agent recognizes that the context window is clogged. It clears its vector/session cache, queries `retrieve_context` to re-fetch only the latest working files, and restarts with a pristine, lightweight context window.

### Why It Is Useful:
* **Drastically Lowers Token Costs:** Long agent chats compile massive amounts of tokens. Each prompt sends the whole history. Pruning the garbage stops you from paying over and over again for 20 pages of obsolete stack traces from errors you fixed hours ago.
* **Eradicates Hallucinations:** When LLM context gets too large, models suffer from "needle-in-a-haystack" degradation, starting to mix up old variables with new ones. Periodic context garbage collection keeps the model hyper-focused, precise, and highly accurate.
