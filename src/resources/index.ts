// SPDX-License-Identifier: MIT

import { ServerContext } from "../types.js";
import { loadContextStore } from "../helpers/context-store.js";

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export function registerResources(ctx: ServerContext) {
  const resources: ResourceDefinition[] = [
    {
      uri: "openrouter://models",
      name: "OpenRouter Models Catalog & Pricing",
      description: "Cached model catalog, context limits, and token pricing rates",
      mimeType: "application/json",
    },
    {
      uri: "openrouter://budget/status",
      name: "Budget & Rate Limiting Status",
      description: "Session spend metrics, budget caps, token bucket limits, and active circuit breaker states",
      mimeType: "application/json",
    },
    {
      uri: "openrouter://account/balance",
      name: "OpenRouter Account Credits & Key Info",
      description: "Current credit balance, spending limits, and API key details",
      mimeType: "application/json",
    },
    {
      uri: "openrouter://memory/all",
      name: "Pinned Semantic Memory Context",
      description: "All pinned architectural decisions, domain constraints, and workspace memory",
      mimeType: "application/json",
    },
  ];

  async function readResource(uri: string): Promise<{ contents: Array<{ uri: string; mimeType: string; text: string }> }> {
    const parsedUri = new URL(uri);
    const hostPath = `${parsedUri.hostname}${parsedUri.pathname}`;

    if (hostPath === "models") {
      let modelsData = ctx.modelsCache;
      if (!modelsData || modelsData.length === 0) {
        modelsData = Object.entries(ctx.pricingCache || {}).map(([id, info]) => ({
          id,
          name: id,
          context_length: 4096,
          pricing: info,
        }));
      }
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(modelsData, null, 2),
          },
        ],
      };
    }

    if (hostPath === "budget/status") {
      const openBreakers: Record<string, string> = {};
      const now = Date.now();
      for (const [model, cb] of ctx.circuitBreakerMap.entries()) {
        if (cb.open_until > now) {
          const remaining = Math.ceil((cb.open_until - now) / 1000);
          openBreakers[model] = `OPEN (${cb.failures} failures, ${remaining}s cooldown)`;
        }
      }

      const status = {
        session_cost: `$${ctx.sessionUsage.cost.toFixed(4)}`,
        max_dollars: `$${ctx.rateLimiterConfig.max_dollars.toFixed(2)}`,
        warn_at_percent: `${ctx.rateLimiterConfig.warn_at_percent}%`,
        percent_used: `${((ctx.sessionUsage.cost / ctx.rateLimiterConfig.max_dollars) * 100).toFixed(1)}%`,
        max_requests_per_minute: ctx.rateLimiterConfig.max_requests_per_minute,
        active_circuit_breakers: openBreakers,
      };

      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(status, null, 2),
          },
        ],
      };
    }

    if (hostPath === "account/balance") {
      try {
        const response = await ctx.axiosInstance.get("/credits");
        const data = response.data?.data || {};
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify({ error: error.message || "Failed to fetch credits" }, null, 2),
            },
          ],
        };
      }
    }

    if (hostPath.startsWith("memory")) {
      const store = await loadContextStore();
      const parts = hostPath.split("/");
      const tagFilter = parts[1] && parts[1] !== "all" ? parts[1] : null;

      const filtered = tagFilter
        ? store.filter((item: any) => item.tag === tagFilter)
        : store;

      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(filtered, null, 2),
          },
        ],
      };
    }

    throw new Error(`Resource not found: ${uri}`);
  }

  return {
    resources,
    readResource,
  };
}
