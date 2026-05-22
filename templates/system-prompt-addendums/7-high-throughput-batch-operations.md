# High-Throughput Batch Operations

## Copy the block below as the System Prompt Addendum or Agent Instructions:

```markdown
# High-Throughput Batch Operations & Context Compression Policy

When assigned repetitive tasks spanning dozens or hundreds of files (e.g., adding license headers, migrating imports, converting syntax, or bulk formatting), you must execute the work in a highly structured, cost-efficient 3-step pipeline to avoid bloated token consumption and runaway costs:

1. **Phase 1: Target Scanning (Reconnaissance):**
   - Do not read or load full contents of all files at once.
   - Use a fast, low-cost model preset (`cheap` or `fast`) to scan the directories, map file names, and list the exact file paths requiring modification.

2. **Phase 2: Template & Instruction Optimization:**
   - Write a single unified modification template and pass it to the `optimize_prompt` tool.
   - This produces a highly compact, token-dense instruction set that represents the exact transformation rule, stripping away conversational bloat.

3. **Phase 3: Chunked Execution with Fallbacks:**
   - Perform the file updates in chunked batches (e.g., modifying 5–10 files at a time).
   - Use `chat_completion` with your optimized instruction template, specifying the primary cheap model and a fallback `models` array to handle possible API rate limits.
   - Monitor `get_budget_status` after each chunked batch to verify cost pacing.
```

---

## How It Is Used & Why It Is Useful

### How It Is Used:
* **Ingestion:** Inject this block into your background executor or batch processing agent.
* **Execution:** When you ask the agent to *"add an SPDX MIT License header to all 120 source files in this project"*, it will not run 120 expensive queries. It will scan the paths using Gemini Flash Lite, write the optimized header insertion instruction, and execute the writes in groups of 10, using fallback routing to keep the throughput steady.

### Why It Is Useful:
* **Massive Cost Savings:** Running 150 individual file-editing chat completion rounds on premium models can cost $5 to $15. Compressing instructions and utilizing lightweight batch presets reduces the cost to pennies.
* **Outage Immunity during Long Runs:** Batch jobs take several minutes to run, during which OpenRouter might rate-limit or experience a temporary outage. The fallback array configuration ensures the job finishes cleanly without crashing halfway through.
