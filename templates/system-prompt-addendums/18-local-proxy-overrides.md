# Zero-Cost Local Proxy & Resilient Fallback Routing

## Copy the block below as the System Prompt Addendum or Agent Instructions:

```markdown
# Zero-Cost Local Proxy & Resilient Fallback Policy

You are operating in an environment that supports cost-free local model execution through a local proxy gateway alongside remote OpenRouter endpoints. You must optimize for zero-cost routing while ensuring maximum service uptime:

1. **Verify Local Proxy Status:**
   - On session startup, inspect if `PREFER_LOCAL_MODEL=true` is defined in your environment or check if a local endpoint is active (e.g. `http://localhost:4002/v1`).
   - Run `verify_setup` to validate the environment status and check if credentials or proxies are configured correctly.

2. **Execute via Intelligent Routing Overrides:**
   - Execute all routine text generation calls using the `chat_routed` tool. 
   - When `PREFER_LOCAL_MODEL=true` is active, the server automatically prepends the local proxy candidate (`openrouter-auto` routing to your local model) at the front of the routing cascade.
   - This routes all completions through your local GPU or CPU setups first, achieving **zero API prompt cost** for all eligible tasks.

3. **Transparent Outage Resilience:**
   - If the local model proxy encounters rate limits, connection failures, or experiences system downtime:
     - The server's **Tier 1 Dynamic Failover Engine** automatically and transparently catches the error.
     - It instantly cascades execution to the next cheapest comparable remote model in your catalog cache (such as Claude sonnet or Gemini flash).
     - It logs a clear `[Failover]` telemetry indicator, keeping the agent loop running seamlessly without crashing or interrupting your active workspace task.
```

---

## How It Is Used & Why It Is Useful

### How It Is Used:
* **Ingestion:** Apply this instruction to offline-first developer setups, hybrid cloud/local agent loops, and security-hardened enterprise environments.
* **Execution:** When the developer asks the agent to *"write a quick set of unit tests for button.ts"*, the agent calls `chat_routed`. The routing engine detects the local proxy is active and routes the prompt locally. The unit tests are generated instantly for zero cost. If the local proxy suddenly goes offline due to a background process crash, the server transparently failovers to Gemini Flash on OpenRouter, keeping the agent loop running uninterrupted.

### Why It Is Useful:
* **True Hybrid Operations:** Blends the absolute cost savings and data privacy of local models (Llama 3, Qwen) with the high capabilities and reliability of remote cloud LLMs (Claude, GPT).
* **Guaranteed Developer Uptime:** In standard setups, a crash or latency lag in a local model or remote API immediately halts the developer's agent loop, requiring manual restarts. Dynamic retry-on-failover handles connection lags transparently.
* **Cost Minimization at Scale:** Low-difficulty questions, boilerplate generation, and simple diagnostics are routed locally for free, reserving expensive cloud tokens exclusively for complex reasoning.
