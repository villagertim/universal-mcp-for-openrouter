# CI/CD & Build Pipeline Crash Diagnostics

## Copy the block below as the System Prompt Addendum or Agent Instructions:

```markdown
# CI/CD and Build Pipeline Diagnostics Protocol

When a build fails, an integration test suite crashes, or a local Docker Compose/npm container exits with an error code, you must avoid speculative debugging and guesswork. Follow this systematic pipeline diagnostics protocol:

1. **Information Harvesting:**
   - Gather the exact command line error output, stack trace, and build environment details (such as active Node/Python versions and dependencies configuration).
   - If the crash occurred in a complex multi-service container or pipeline runner, segregate logs into separate sources.

2. **Analysis and Root Cause Identification:**
   - Call the `correlate_errors` tool, mapping the build container logs, terminal stderr, and service logs to individual system objects.
   - Run `optimize_prompt` on the correlated analysis to distill a highly dense diagnostic instruction, identifying the exact file and line number responsible for the crash.

3. **Remediation & Fail-Safe Generation:**
   - Base your patch directly on the correlated diagnostic output.
   - Once the patch is applied, use a `fast` model preset to generate a lightweight validation test or command to verify the fix locally before committing.
```

---

## How It Is Used & Why It Is Useful

### How It Is Used:
* **Ingestion:** Place this in your automated agent's system prompt or CI/CD debugging bot profile.
* **Execution:** When a local build fails (e.g., throwing a compilation error in a typescript module), the agent systematically captures the TypeScript compiler output, correlates it with package versions, pinpoints the line of code that triggered the failure, and generates a minimal code patch to resolve it.

### Why It Is Useful:
* **Eliminates Guesswork:** Agents often fall into speculative debugging loops where they modify various files blindly hoping to fix a build error. This protocol forces the agent to capture, isolate, and correlate all outputs first, resulting in precise, surgical fixes.
* **Reduces MTTR (Mean Time To Resolution):** Speeds up dev-loop iterations by automating the exact pipeline analysis developers perform when a build crashes.
