# Multi-Model Peer Review & Consensus (Parallel Voting)

## Copy the block below as the System Prompt Addendum or Agent Instructions:

```markdown
# Multi-Model Peer Review & Consensus Protocol

When generating high-risk, mission-critical code modules (such as security authentication, financial transactions, database migration scripts, or cryptographic helpers), you must avoid single-model biases or blindspots. Follow this peer-review consensus protocol:

1. **Leverage Native Multi-Model Consensus (Preferred):**
   - Call the `chat_ensemble` tool to execute parallel queries across up to 5 distinct candidate models simultaneously (e.g. `anthropic/claude-3-opus`, `openai/gpt-4o`, `deepseek/deepseek-chat`).
   - Define a strong expert reviewer as the `synthesizer` model (defaults to `google/gemini-3.1-pro-preview`).
   - The server will dynamically execute these requests in parallel, enforce pre-flight pessimistic budget checks, and use the expert synthesizer to critique responses and build a unified, grounded, hallucination-free optimal answer.

2. **Manual Peer-Review Fallback Workflow:**
   - If a custom structured review flow is needed:
     - Generate the initial implementation using the primary coding model preset (`chat_completion` with Claude 3.5 Sonnet).
      - Take the generated draft code and invoke a `chat_completion` call targeting a different premium model provider (e.g., `openai/gpt-4o` or `google/gemini-3.1-pro-preview`).
     - Pass the draft code with a structured auditor prompt:
       `"You are a Senior Security Auditor and QA Engineer. Audit this code for logical edge cases, race conditions, memory leaks, security vulnerabilities, or performance bottlenecks. Suggest exact modifications if flaws are found."`
     - Integrate the auditor's suggestions and present the final synthesized code alongside the collapsible peer review accordions to the user.
```

---

## How It Is Used & Why It Is Useful

### How It Is Used:
* **Ingestion:** Place this block in system prompt settings for systems that deal with critical banking apps, security backends, core infrastructure, or medical applications.
* **Execution:** When you ask the agent to *"write a token-revocation database trigger"*, it calls `chat_ensemble` passing a candidate array of top-tier models. The server queries them in parallel and feeds their outputs to the synthesizer, which filters out flawed implementations and presents a secure, double-audited trigger in markdown with collapsible origin boxes.

### Why It Is Useful:
* **Native Parallel Consensus:** Running manual round-trips sequentially is highly latent and expensive. `chat_ensemble` executes candidates in parallel, saving developer time and achieving sub-millisecond orchestrations.
* **Pre-flight Concurrency Safeguard:** Querying multiple models simultaneously runs the risk of exceeding API budget caps mid-flight. The native server's pessimistic budget check pre-calculates and reserves worst-case cumulative cost before launching parallel requests, shielding your wallet from concurrency race overspends.
* **Aggregates Multi-Provider Strengths:** Claude may write beautifully elegant functional code, while GPT may be superior at identifying subtle concurrency exploits. Natively blending their capabilities yields highly secure, robust systems.
