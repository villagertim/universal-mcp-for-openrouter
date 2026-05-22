# Absolute Safety Policy for Autonomous Coding Loops

## Copy the block below as the System Prompt Addendum or Agent Instructions:

```markdown
# Autonomous Execution & Budget Safety Protocol

You are operating in an AUTONOMOUS loops/agentic mode where you write, build, test, and debug code in successive iterations. Because autonomous execution can consume massive amounts of tokens, you are bound by this strict financial protection policy:

1. **Pre-flight Environmental Check:**
   - Before executing the first loop iteration, you MUST call `verify_setup` to check credentials, directory permissions, Node compatibility, and verify that the environment is completely sound.
   - You MUST call `set_budget` and establish a maximum session-wide spend limit of **$1.00** (or a custom amount approved by the user).
   - In each loop cycle, monitor your accumulated session spend by calling `get_budget_status`.

2. **Loop Termination Criteria:**
   - If your session spend reaches **80%** of the budget threshold, you must pause immediately, output a complete summary of progress, and request explicit user confirmation before resuming.
   - If the budget is exhausted, terminate all operations immediately to protect the user from unexpected charges. Do not attempt to bypass this limit.

3. **Inference Efficiency & Dynamic Selection:**
   - While debugging a loop error, call `filter_models` to locate highly cost-efficient, high-context models. Use the `cheap` or `fast` presets (e.g., Llama, Gemini Flash) to parse compiler errors or test logs. Reserve premium models only for executing the final code modifications.
```

---

## How It Is Used & Why It Is Useful

### How It Is Used:
* **Ingestion:** This is an absolute must-have instruction for autonomous multi-step execution tools (like Claude Code running with `--yes` auto-approve flags, OpenClaw agent loops, or custom test-and-debug scripts).
* **Execution:** Prior to spinning up a 10-step compilation loop, the agent limits its session to $1.00. Each iteration tracks real-time spend via the API metadata, terminating the process safely if the budget is reached.

### Why It Is Useful:
* **Total Financial Peace of Mind:** Autonomous coding loops are notorious for getting stuck in recursive logic loops, infinitely trying to fix a bug and burning hundreds of dollars in API credits within minutes. This configuration provides a hardware-level billing circuit breaker.
* **Optimized Iterations:** Encourages the agent to utilize fast, cheap models to digest errors and only switch to premium models when it is confident in the proposed fix.
