// SPDX-License-Identifier: MIT
import fs from "fs/promises";

async function main() {
  console.log("🚀 Starting peer review of Revised Option D via local proxy...");

  const prompt = `You are a Senior Principal AI Software Architect and technical peer reviewer.
We are proposing a new feature for our Universal OpenRouter MCP Server:
**Revised Option D: Intelligent Model-Task Routing (Context-Aware Dynamic Resource Routing)**.

### Current Problem
In the existing codebase:
1. When requesting completions, users or client agents must manually select specific models or presets (\`smart\`, \`cheap\`, etc.).
2. The agent client-side must implement its own routing strategy to save costs (avoiding external calls when local models are capable), but it has no easy way to query actual catalog constraints, sizes, or live rates to choose the cheapest *eligible* provider dynamically.
3. High-context operations (e.g., feeding large files to a model) can accidentally route to highly expensive models, wasting budget.

### Revised Option D Design: Context-Aware Dynamic Resource Routing
We propose introducing a new tool: \`chat_routed\`.
\`\`\`json
{
  "name": "chat_routed",
  "description": "Execute a chat completion with intelligent, automatic cost-aware model routing based on prompt size, required context length, and task attributes.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "prompt": { "type": "string", "description": "The main prompt to run" },
      "system_prompt": { "type": "string", "description": "Optional system prompt" },
      "task_category": { "type": "string", "enum": [\"general\", \"code\", \"creative\", \"vision\"], \"description\": \"The general category of the task\" },
      "max_usd_price_per_1m_prompt": { "type": "number", "description": "Strict maximum cost in USD per 1M prompt tokens (e.g., 2.50)" },
      "require_vision": { "type": "boolean", "description": \"Whether the model must support image/vision inputs\" }
    },
    "required": [\"prompt\"]
  }
}
\`\`\`

### Routing Logic
1. **Dynamic Token Measurement**: Measure the exact size of the input prompt (and any system prompt).
2. **Catalog Slicing (Local Pricing Cache)**: Read the local \`pricing_cache.json\` catalog to filter all models that:
   - Match the capability (e.g. have vision support if \`require_vision\` is true).
   - Have a context window size >= the calculated prompt size (plus a safety buffer).
   - Have a pricing per 1M prompt tokens <= \`max_usd_price_per_1m_prompt\` (if provided, else dynamic thresholds based on \`task_category\`).
3. **Optimized Selection**: Rank the eligible models by price. Select the cheapest one matching the desired category performance target.
4. **Resilient Execution Loop**: Attempt completion with the cheapest model. If it fails (due to provider issues, circuit breaker trigger, or rate limiting), fall back dynamically down the list of cheap eligible models.

### Task for Peer Reviewer
Analyze this proposed tool. Is it actually worth doing?
- What are the pros and cons?
- Does it overlap too much with the existing \`chat_completion\` (which supports manual fallback lists) or \`chat_with_preset\` (which hardcodes fallbacks)?
- Does it provide substantial value to agentic workflows?
- Should we build it? If so, what critical refinements would make it truly valuable?
- Provide a clear recommendation (Approve/Reject/Modify).`;

  try {
    const response = await fetch("http://localhost:4002/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openrouter-auto",
        messages: [
          { role: "system", content: "You are an expert AI architect. Be critical, analytical, and highly structured." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Local proxy responded with status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const resultText = data.choices[0].message.content;

    console.log("\n================ PEER REVIEW REPORT ================");
    console.log(resultText);
    console.log("====================================================");

    // Save the review report to a scratch file
    await fs.writeFile("scratch/peer-review-report.md", resultText, "utf-8");
    console.log("\nSaved review report to scratch/peer-review-report.md");
  } catch (error) {
    console.error("❌ Peer review failed:", error);
    process.exit(1);
  }
}

main();
