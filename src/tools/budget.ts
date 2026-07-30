// SPDX-License-Identifier: MIT

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ServerContext, SetBudgetArgs } from "../types.js";
import { saveRateConfig } from "../helpers/config-store.js";

export function registerBudgetTools(ctx: ServerContext) {
  const tools = [
    {
      name: "set_budget",
      title: "Set Budget Limit",
      description: "Set a session-wide spending limit (in USD) and warning threshold",
      annotations: { destructiveHint: true },
      inputSchema: {
        type: "object",
        properties: {
          max_dollars: { type: "number", description: "The maximum amount to spend this session" },
          warn_at_percent: { type: "number", description: "Percentage of budget used before issuing warnings" }
        }
      },
    },
    {
      name: "get_budget_status",
      title: "Get Budget Status",
      description: "Check the current session spending and budget status",
      annotations: { readOnlyHint: true, idempotentHint: true },
      inputSchema: { type: "object", properties: {} },
    }
  ];

  return {
    tools,
    handlers: {
      set_budget: handleSetBudget,
      get_budget_status: handleGetBudgetStatus,
    }
  };

  async function handleSetBudget(args: SetBudgetArgs) {
    const { max_dollars, warn_at_percent } = args;
    if (max_dollars !== undefined) ctx.rateLimiterConfig.max_dollars = max_dollars;
    if (warn_at_percent !== undefined) ctx.rateLimiterConfig.warn_at_percent = warn_at_percent;
    
    await saveRateConfig(ctx.rateLimiterConfig);

    return { content: [{ type: "text", text: `✅ Budget updated: Limit $${ctx.rateLimiterConfig.max_dollars.toFixed(2)}, Warn at ${ctx.rateLimiterConfig.warn_at_percent}%` }] };
  }

  async function handleGetBudgetStatus() {
    const { cost } = ctx.sessionUsage;
    const { max_dollars, max_requests_per_minute } = ctx.rateLimiterConfig;
    const breakers: string[] = [];
    for (const [m, s] of ctx.circuitBreakerMap.entries()) {
      if (s.failures > 0 || s.open_until > Date.now()) {
        breakers.push(`  ${m}: ${s.open_until > Date.now() ? "🔴 OPEN" : "🟡 CLOSED"}`);
      }
    }
    const buckets: string[] = [];
    for (const [m, s] of ctx.tokenBucketMap.entries()) {
      buckets.push(`  ${m}: ${s.tokens.toFixed(1)}/${max_requests_per_minute}`);
    }
    return {
      content: [{
        type: "text",
        text: `📊 STATUS:\nBudget: $${cost.toFixed(6)} / $${max_dollars.toFixed(2)} (${((cost / max_dollars) * 100).toFixed(1)}%)\n\nBreakers:\n${breakers.join("\n") || "  Healthy"}\n\nBuckets:\n${buckets.join("\n") || "  None"}`
      }],
    };
  }
}
