// SPDX-License-Identifier: MIT

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ServerContext } from "../types.js";
import { withErrorHandler } from "../helpers/error-handler.js";

export function registerAccountTools(ctx: ServerContext) {
  const tools = [
    {
      name: "get_balance",
      title: "Get Credit Balance",
      description: "Check your OpenRouter credit balance",
      annotations: { readOnlyHint: true },
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_key_info",
      title: "Get API Key Info",
      description: "Get information about the current API key (limits, usage, etc.)",
      annotations: { readOnlyHint: true },
      inputSchema: { type: "object", properties: {} },
    }
  ];

  return {
    tools,
    handlers: {
      get_balance: withErrorHandler("get_balance", handleGetBalance),
      get_key_info: withErrorHandler("get_key_info", handleGetKeyInfo),
    }
  };

  async function handleGetBalance() {
    const response = await ctx.axiosInstance.get("/credits");
    return { content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }] };
  }

  async function handleGetKeyInfo() {
    const response = await ctx.axiosInstance.get("/key");
    return { content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }] };
  }
}
