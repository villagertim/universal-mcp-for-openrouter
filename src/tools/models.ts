// SPDX-License-Identifier: MIT

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ServerContext, OpenRouterModel, ModelsResponse } from "../types.js";

export function registerModelTools(ctx: ServerContext) {
  const tools = [
    {
      name: "list_models",
      description: "List available models on OpenRouter",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "filter_models",
      description: "Filter and search available OpenRouter models based on requirements (e.g. cost, context window, vision)",
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
      description: "Get the total token usage and estimated cost for the current session",
      inputSchema: { type: "object", properties: {} },
    }
  ];

  return {
    tools,
    handlers: {
      list_models: handleListModels,
      filter_models: handleFilterModels,
      get_session_usage: handleGetSessionUsage,
    }
  };

  async function handleListModels() {
    try {
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
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error fetching models: ${error.message}` }], isError: true };
    }
  }

  async function handleFilterModels(args: any) {
    const { query, min_context_length, max_price_per_1m_prompt, supports_vision, limit = 10 } = args;
    try {
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

      // 1. Query keyword filter
      if (query) {
        const q = query.toLowerCase();
        filtered = filtered.filter(m => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));
      }

      // 2. Min context length filter
      if (min_context_length !== undefined) {
        filtered = filtered.filter(m => m.context_length >= min_context_length);
      }

      // 3. Max prompt cost per 1M tokens
      if (max_price_per_1m_prompt !== undefined) {
        filtered = filtered.filter(m => {
          const price = parseFloat(m.pricing.prompt) * 1_000_000;
          return price <= max_price_per_1m_prompt;
        });
      }

      // 4. Supports vision filter
      if (supports_vision !== undefined) {
        filtered = filtered.filter(m => {
          const hasImagePricing = m.pricing.image !== undefined;
          const hasVisionInName = m.id.toLowerCase().includes("vision") || m.id.toLowerCase().includes("vl") || m.id.toLowerCase().includes("gemini");
          const supports = hasImagePricing || hasVisionInName;
          return supports_vision ? supports : !supports;
        });
      }

      // Limit results
      const finalLimit = Math.min(50, Math.max(1, limit));
      filtered = filtered.slice(0, finalLimit);

      return { content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error filtering models: ${error.message}` }], isError: true };
    }
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
