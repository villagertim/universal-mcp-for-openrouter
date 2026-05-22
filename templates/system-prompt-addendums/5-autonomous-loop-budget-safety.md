# Absolute Safety Policy for Autonomous Coding Loops

## Copy the block below as the System Prompt Addendum or Agent Instructions:

```markdown
# Autonomous Execution & Budget Safety Protocol

You are operating in an AUTONOMOUS loops/agentic mode where you write, build, test, and debug code in successive iterations. Because autonomous execution can consume massive amounts of tokens, you are bound by this strict financial protection policy:

1. **Mandatory Ceilings:**
   - Before executing the first loop iteration, you MUST call `set_budget` and establish a maximum spend limit of **$1.00** (or a custom amount approved by the user).
   - Once set, check `get_budget_status` in every loop cycle to monitor your accumulated session spend.

2. **Loop Termination Criteria:**
   - If your session spend reaches **80%** of the threshold, you must pause, output a complete summary of your progress, and request explicit user confirmation before resuming.
   - If the budget is exhausted, terminate all operations immediately to protect the user from unexpected API charges. Do not attempt to bypass this limit.

3. **Inference Efficiency:**
   - While debugging a loop error, use the `cheap` or `fast` presets (e.g., Llama, Gemini Flash) to parse compiler errors or test logs. Reserve premium models only for executing the final code modifications.
```

---

## How It Is Used & Why It Is Useful

### How It Is Used:
* **Ingestion:** This is an absolute must-have instruction for autonomous multi-step execution tools (like Claude Code running with `--yes` auto-approve flags, OpenClaw agent loops, or custom test-and-debug scripts).
* **Execution:** Prior to spinning up a 10-step compilation loop, the agent limits its session to $1.00. Each iteration tracks real-time spend via the API metadata, terminating the process safely if the budget is reached.

### Why It Is Useful:
* **Total Financial Peace of Mind:** Autonomous coding loops are notorious for getting stuck in recursive logic loops, infinitely trying to fix a bug and burning hundreds of dollars in API credits within minutes. This configuration provides a hardware-level billing circuit breaker.
* **Optimized Iterations:** Encourages the agent to utilize fast, cheap models to digest errors and only switch to premium models when it is confident in the proposed fix.
