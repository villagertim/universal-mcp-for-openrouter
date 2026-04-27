import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerModelTools } from "../../src/tools/models.js";
import { ServerContext } from "../../src/types.js";
import { AxiosInstance } from "axios";

describe("Models & Session Management (#2)", () => {
  let mockCtx: ServerContext;
  let mockAxios: any;

  beforeEach(() => {
    mockAxios = {
      get: vi.fn(),
    };

    mockCtx = {
      axiosInstance: mockAxios as unknown as AxiosInstance,
      rateLimiterConfig: { max_dollars: 10, warn_at_percent: 80, max_requests_per_minute: 20 },
      sessionUsage: { prompt_tokens: 1000, completion_tokens: 500, cost: 0.015 },
      circuitBreakerMap: new Map(),
      tokenBucketMap: new Map(),
      pricingCache: {},
    };
  });

  it("list_models should fetch and format models from OpenRouter", async () => {
    const { handlers } = registerModelTools(mockCtx);
    
    mockAxios.get.mockResolvedValue({
      data: {
        data: [
          { id: "model-1", name: "Model One", context_length: 8192, pricing: { prompt: "0.01", completion: "0.02" } },
          { id: "model-2", name: "Model Two", context_length: 16384, pricing: { prompt: "0.02", completion: "0.04" } }
        ]
      }
    });

    const result = await handlers.list_models();

    expect(mockAxios.get).toHaveBeenCalledWith("/models");
    const models = JSON.parse(result.content[0].text);
    expect(models).toHaveLength(2);
    expect(models[0].id).toBe("model-1");
  });

  it("get_session_usage should return the current context usage statistics", async () => {
    const { handlers } = registerModelTools(mockCtx);
    
    const result = await handlers.get_session_usage();

    expect(result.content[0].text).toContain("Prompt Tokens: 1,000");
    expect(result.content[0].text).toContain("Completion Tokens: 500");
    expect(result.content[0].text).toContain("Estimated Cost: $0.015000");
  });

  it("list_models should handle API errors gracefully", async () => {
    const { handlers } = registerModelTools(mockCtx);
    
    mockAxios.get.mockRejectedValue(new Error("Connection Timeout"));

    const result = await handlers.list_models();

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Error fetching models: Connection Timeout");
  });
});
