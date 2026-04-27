import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerAccountTools } from "../src/tools/account.js";
import { ServerContext } from "../src/types.js";
import { AxiosInstance } from "axios";

describe("Account Management (#3)", () => {
  let mockCtx: ServerContext;
  let mockAxios: any;

  beforeEach(() => {
    mockAxios = {
      get: vi.fn(),
    };

    mockCtx = {
      axiosInstance: mockAxios as unknown as AxiosInstance,
      rateLimiterConfig: { max_dollars: 10, warn_at_percent: 80, max_requests_per_minute: 20 },
      sessionUsage: { prompt_tokens: 0, completion_tokens: 0, cost: 0 },
      circuitBreakerMap: new Map(),
      tokenBucketMap: new Map(),
      pricingCache: {},
    };
  });

  it("get_balance should return the user credit balance", async () => {
    const { handlers } = registerAccountTools(mockCtx);
    
    mockAxios.get.mockResolvedValue({
      data: {
        data: {
          total_credits: 25.50,
          is_active: true
        }
      }
    });

    const result = await handlers.get_balance();

    expect(mockAxios.get).toHaveBeenCalledWith("/credits");
    expect(result.content[0].text).toContain("25.5");
    expect(result.content[0].text).toContain("true");
  });

  it("get_key_info should return API key metadata", async () => {
    const { handlers } = registerAccountTools(mockCtx);
    
    mockAxios.get.mockResolvedValue({
      data: {
        data: {
          label: "My Production Key",
          limit: 100,
          usage: 45.2
        }
      }
    });

    const result = await handlers.get_key_info();

    expect(mockAxios.get).toHaveBeenCalledWith("/key");
    expect(result.content[0].text).toContain("My Production Key");
    expect(result.content[0].text).toContain("45.2");
  });

  it("should handle authentication errors gracefully", async () => {
    const { handlers } = registerAccountTools(mockCtx);
    
    mockAxios.get.mockRejectedValue({
      response: { data: { error: { message: "Unauthorized" } } }
    });

    const result = await handlers.get_balance();

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Unauthorized");
  });
});
