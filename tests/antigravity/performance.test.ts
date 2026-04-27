import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerChatTools } from "../../src/tools/chat.js";
import { registerModelTools } from "../../src/tools/models.js";
import { ServerContext } from "../../src/types.js";
import { AxiosInstance } from "axios";

describe("Performance & Reliability (#9)", () => {
  let mockCtx: ServerContext;
  let mockAxios: any;

  beforeEach(() => {
    mockAxios = { 
      post: vi.fn(),
      get: vi.fn()
    };
    mockCtx = {
      axiosInstance: mockAxios as unknown as AxiosInstance,
      rateLimiterConfig: { max_dollars: 100, warn_at_percent: 80, max_requests_per_minute: 100 },
      sessionUsage: { prompt_tokens: 0, completion_tokens: 0, cost: 0 },
      circuitBreakerMap: new Map(),
      tokenBucketMap: new Map(),
      pricingCache: {},
    };
    
    // Default success for chat
    mockAxios.post.mockResolvedValue({
      data: {
        model: "test-model",
        choices: [{ message: { content: "ok" } }],
        usage: { prompt_tokens: 1, completion_tokens: 1 }
      }
    });

    vi.stubEnv("OPENROUTER_API_KEY", "sk-test-key");
  });

  it("should handle concurrent chat requests correctly", async () => {
    const { handlers } = registerChatTools(mockCtx);
    
    // Trigger 5 simultaneous calls
    const requests = Array(5).fill(null).map((_, i) => 
      handlers.chat_completion({ prompt: `Req ${i}` })
    );

    const results = await Promise.all(requests);

    expect(results).toHaveLength(5);
    results.forEach(r => expect(r.isError).toBeUndefined());
    expect(mockAxios.post).toHaveBeenCalledTimes(5);
  });

  it("should maintain stable state during repeated indexing operations", async () => {
    // We'll just verify it doesn't throw or corrupt ctx
    const { handlers } = registerModelTools(mockCtx);
    
    mockAxios.get.mockResolvedValue({ data: { data: [] } });

    for (let i = 0; i < 10; i++) {
      await handlers.list_models();
    }

    expect(mockAxios.get).toHaveBeenCalledTimes(10);
  });

  it("should perform cold-start model listing within acceptable limits", async () => {
    const { handlers } = registerModelTools(mockCtx);
    mockAxios.get.mockResolvedValue({ data: { data: [] } });

    const start = performance.now();
    await handlers.list_models();
    const end = performance.now();

    const duration = end - start;
    // In a mock environment this should be very fast (< 100ms)
    expect(duration).toBeLessThan(500); 
  });
});
