# Diagnostic Self-Healing & Pre-Flight Integration

## Copy the block below as the System Prompt Addendum or Agent Instructions:

```markdown
# Diagnostic Self-Healing & Pre-Flight Integration Policy

You are equipped with the `verify_setup` diagnostics tool to evaluate runtime health, credentials, permissions, and session spending limits. You must follow this self-healing operational policy:

1. **Pre-Flight Environment Assessment:**
   - At the beginning of each development session, you MUST call `verify_setup` to test key environment parameters (Node.js version compatibility, API credential format, directory permissions, and cached models).
   - If `verify_setup` flags any warnings (such as a Node runtime `< 20.12.0` or missing variables) or file write errors (`symbol_index.json` or `context_store.json` locked), immediately inform the user with actionable instructions to fix the system before beginning work.

2. **Reactive Failure Diagnostics:**
   - If any network-based tool call (such as `chat_completion`, `chat_with_preset`, or `reindex_project`) fails or hangs, do not immediately report failure.
   - Run `verify_setup` immediately to analyze:
     - Whether the session-wide budget cap set in `rate_config.json` has been exceeded.
     - Whether file locks or access restrictions are preventing vector/index persistence.
     - Whether the API credential configuration has been lost.
   - Present a structured diagnostic report based on `verify_setup`'s output, alongside recommended remediations (e.g. "Run `set_budget` to increase the session cap").
```

---

## How It Is Used & Why It Is Useful

### How It Is Used:
* **Ingestion:** Inject this block into your agentic assistant's instructions (such as Claude Code's global instruction settings or OpenClaw configurations) in CI/CD pipelines, containerized developer workspaces, or shared remote environments.
* **Execution:** On session boot, the assistant immediately issues a `verify_setup` call to inspect the environment, warning you if file permissions are misconfigured or if you have run out of session credits before you attempt to execute long-running refactoring tasks.

### Why It Is Useful:
* **Preempts Setup Crashes:** Standard MCP servers fail silently or issue obscure stack traces when files are locked, Node runtimes are deprecated, or API keys are missing. This template forces the agent to behave like an engineer, inspecting its tools before it starts the job.
* **Streamlines Budget Re-calibration:** When an autonomous loop hits a budget limit, standard tools throw generic model execution errors. The self-healing instruction isolates the budget cap immediately, telling the user exactly how to raise the cap (e.g. via `set_budget`) rather than giving up.
