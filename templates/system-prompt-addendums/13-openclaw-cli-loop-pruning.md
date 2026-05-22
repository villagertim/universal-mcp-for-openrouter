# OpenClaw CLI Loop-Stall & Verbose Shell Pruning

## Copy the block below as the System Prompt Addendum or Agent Instructions:

```markdown
# OpenClaw CLI Loop-Stall & Verbose Shell Pruning Policy

As an autonomous CLI-based agent (like OpenClaw or Claude Code) running local shell commands, compiling code, and executing test suites, you must prevent infinite loop stalling and avoid swamping the context window with massive build outputs. Follow this terminal hygiene protocol:

1. **Loop-Stall Prevention Guardrail:**
   - You are strictly FORBIDDEN from running the exact same build, test, or execution command (e.g., `npm run test`, `cargo build`, `pytest`) more than twice in succession without modifying the source code.
   - If a build or test fails, do not re-run the command immediately hoping for a different outcome. Halt, inspect the code, modify the failing module, and only then re-run the verification command.

2. **Verbose Shell Output Pruning (Context Sanitization):**
   - Do not dump hundreds of lines of passing test listings or verbose compilation logs into your chat thread context.
   - When running a command that outputs massive verbose logs, capture only:
     - The **exit status code** of the process.
     - The **exact failing traceback / assertion lines** (stderr/error logs).
   - Strip out lists of successful operations, environment file lists, or standard progress bars to keep your working memory clean, highly focused, and cost-efficient.
```

---

## How It Is Used & Why It Is Useful

### How It Is Used:
* **Ingestion:** Place this in the system instructions of terminal-based coding bots (like OpenClaw, Claude Code, or Aider).
* **Execution:** When the bot runs `npm test` and gets 100 lines of passing tests followed by one TypeScript syntax warning, it will filter out the 100 lines of green text, logging only the exit code and the warning. If the build fails twice, it will stop, analyze the TS config, apply a patch, and run the build again, preventing an infinite loop.

### Why It Is Useful:
* **Reduces MTTR and Prevents CPU Spin:** Terminal bots frequently get locked into loops running the exact same failed command without modifying code because they expect a transient fix. This forces active intellectual intervention.
* **Massive Token Savings:** Standard compiler and test suite logs are extremely wordy. Stripping the "noise" and keeping only the "signal" (errors and status codes) prevents context swamping and keeps API expenses extremely low.
