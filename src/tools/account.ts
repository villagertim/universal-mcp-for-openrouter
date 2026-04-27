import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ServerContext } from "../types.js";

export function registerAccountTools(ctx: ServerContext) {
  const tools = [
    {
      name: "get_balance",
      description: "Check your OpenRouter credit balance",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_key_info",
      description: "Get information about the current API key (limits, usage, etc.)",
      inputSchema: { type: "object", properties: {} },
    }
  ];

  return {
    tools,
    handlers: {
      get_balance: handleGetBalance,
      get_key_info: handleGetKeyInfo,
    }
  };

  async function handleGetBalance() {
    try {
      const response = await ctx.axiosInstance.get("/credits");
      return { content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error fetching balance: ${error.response?.data?.error?.message || error.message}` }], isError: true };
    }
  }

  async function handleGetKeyInfo() {
    try {
      const response = await ctx.axiosInstance.get("/key");
      return { content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error fetching key info: ${error.response?.data?.error?.message || error.message}` }], isError: true };
    }
  }
}
