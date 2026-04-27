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
      name: "get_session_usage",
      description: "Get the total token usage and estimated cost for the current session",
      inputSchema: { type: "object", properties: {} },
    }
  ];

  return {
    tools,
    handlers: {
      list_models: handleListModels,
      get_session_usage: handleGetSessionUsage,
    }
  };

  async function handleListModels() {
    try {
      const response = await ctx.axiosInstance.get<ModelsResponse>("/models");
      const models: OpenRouterModel[] = response.data.data.map(m => ({
        id: m.id,
        name: m.name,
        context_length: m.context_length,
        pricing: m.pricing,
      }));
      return { content: [{ type: "text", text: JSON.stringify(models, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error fetching models: ${error.message}` }], isError: true };
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
