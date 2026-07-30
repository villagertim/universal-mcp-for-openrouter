// SPDX-License-Identifier: MIT

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ServerContext, OpenRouterModel, ModelsResponse, FilterModelsArgs } from "../types.js";
import { withErrorHandler } from "../helpers/error-handler.js";

export function registerModelTools(ctx: ServerContext) {
  const tools = [
    {
      name: "list_models",
      title: "List Available Models",
      description: "List available models on OpenRouter",
      annotations: { readOnlyHint: true, idempotentHint: true },
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "filter_models",
      title: "Filter Models",
      description: "Filter and search available OpenRouter models based on requirements (e.g. cost, context window, vision)",
      annotations: { readOnlyHint: true, idempotentHint: true },
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Fuzzy search term matching model ID or name (e.g., 'claude', 'gemini')" },
          min_context_length: { type: "number", description: "Minimum context length in tokens" },
          max_price_per_1m_prompt: { type: "number", description: "Maximum prompt price in USD per 1,000,000 tokens" },
          supports_vision: { type: "boolean", description: "Filter for models supporting image/vision inputs" },
          limit: { type: "number", description: "Maximum number of models to return (default: 10, max: 50)", default: 10 }
        }
      }
    },
    {
      name: "get_session_usage",
      title: "Get Session Usage",
      description: "Get the total token usage and estimated cost for the current session",
      annotations: { readOnlyHint: true },
      inputSchema: { type: "object", properties: {} },
    }
  ];

  return {
    tools,
    handlers: {
      list_models: withErrorHandler("list_models", handleListModels),
      filter_models: withErrorHandler("filter_models", handleFilterModels),
      get_session_usage: handleGetSessionUsage,
    }
  };

  async function handleListModels() {
    let models: OpenRouterModel[];
    if (ctx.modelsCache && ctx.modelsCache.length > 0) {
      models = ctx.modelsCache;
    } else {
      const response = await ctx.axiosInstance.get<ModelsResponse>("/models");
      models = response.data.data.map(m => ({
        id: m.id,
        name: m.name,
        context_length: Number(m.context_length),
        pricing: m.pricing,
      }));
      ctx.modelsCache = models;
    }
    return { content: [{ type: "text", text: JSON.stringify(models, null, 2) }] };
  }

  async function handleFilterModels(args: FilterModelsArgs) {
    const { query, min_context_length, max_price_per_1m_prompt, supports_vision, limit = 10 } = args;
    let models: OpenRouterModel[];
    if (ctx.modelsCache && ctx.modelsCache.length > 0) {
      models = ctx.modelsCache;
    } else {
      const response = await ctx.axiosInstance.get<ModelsResponse>("/models");
      models = response.data.data.map(m => ({
        id: m.id,
        name: m.name,
        context_length: Number(m.context_length),
        pricing: m.pricing,
      }));
      ctx.modelsCache = models;
    }

    let filtered = models;

    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(m => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));
    }

    if (min_context_length !== undefined) {
      filtered = filtered.filter(m => m.context_length >= min_context_length);
    }

    if (max_price_per_1m_prompt !== undefined) {
      filtered = filtered.filter(m => {
        const price = parseFloat(m.pricing.prompt) * 1_000_000;
        return price <= max_price_per_1m_prompt;
      });
    }

    if (supports_vision !== undefined) {
      filtered = filtered.filter(m => {
        const hasImagePricing = m.pricing.image !== undefined;
        const hasVisionInName = m.id.toLowerCase().includes("vision") || m.id.toLowerCase().includes("vl") || m.id.toLowerCase().includes("gemini");
        const supports = hasImagePricing || hasVisionInName;
        return supports_vision ? supports : !supports;
      });
    }

    const finalLimit = Math.min(50, Math.max(1, limit));
    filtered = filtered.slice(0, finalLimit);

    return { content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }] };
  }

  async function handleGetSessionUsage() {
    const { prompt_tokens, completion_tokens, cost } = ctx.sessionUsage;
    return {
      content: [{ 
        type: "text", 
        text: `📊 SESSION USAGE REPORT:\n\n- Prompt Tokens: ${prompt_tokens.toLocaleString()}\n- Completion Tokens: ${completion_tokens.toLocaleString()}\n- Total Tokens: ${(prompt_tokens + completion_tokens).toLocaleString()}\n- Estimated Cost: $${cost.toFixed(6)}`
      }],
    };
  }
}
