// SPDX-License-Identifier: MIT

export interface ToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

export type ToolHandler = (args: any) => Promise<ToolResult>;

export function withErrorHandler(handlerName: string, fn: (args: any) => Promise<ToolResult>): ToolHandler {
  return async (args: any) => {
    try {
      return await fn(args);
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.message || String(error);
      console.error(`[${handlerName}] Error:`, message);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  };
}
