# Multi-Model Peer Review & Consensus

## Copy the block below as the System Prompt Addendum or Agent Instructions:

```markdown
# Multi-Model Peer Review & Consensus Protocol

When generating high-risk, mission-critical code modules (such as security authentication, financial transactions, database migration scripts, or cryptographic helpers), you must avoid single-model dependency. Follow this peer-review consensus protocol:

1. **Initial Code Generation (The Draft):**
   - Generate the initial implementation using the primary high-end coding model preset (`coder` or `smart`, e.g., Claude 3.5 Sonnet).

2. **Secondary Model Peer Review (The Audit):**
   - Capture the generated draft code and invoke a `chat_completion` call targeting a different premium model provider (e.g., set `model` to `openai/gpt-5.5`).
   - Use this review system prompt:
     `"You are a Senior Security Auditor and QA Engineer. Audit this code for logical edge cases, race conditions, memory leaks, security vulnerabilities, or performance bottlenecks. Suggest exact modifications if flaws are found."`
   - Feed the draft code into the user message.

3. **Consensus Synthesis:**
   - Review the auditor's suggestions. If flaws were identified, refactor the code to address the issues.
   - Present both the final audited implementation and the peer model's review summary to the user for maximum transparency.
```

---

## How It Is Used & Why It Is Useful

### How It Is Used:
* **Ingestion:** Place this block in system prompt settings for systems that deal with critical banking apps, security backends, core infrastructure, or medical applications.
* **Execution:** When you ask the agent to *"write a token-revocation database trigger"*, it will first draft it with Claude. In the background, it automatically calls GPT-5.5 to audit the query. GPT spots a potential race condition when two tokens are revoked simultaneously, and the agent rewrites the trigger to prevent it before showing you the finished, bulletproof code.

### Why It Is Useful:
* **Mimics Real-World Dev Teams:** Senior developers rarely ship critical code without a second set of eyes. This mimics a professional peer-review pull-request flow completely inside the AI pipeline.
* **Catches Blindspots:** Different LLM providers are trained differently. Claude may write beautifully elegant functional code, while GPT may be superior at identifying subtle concurrency or security exploits. Combining their strengths yields highly secure, robust systems.
