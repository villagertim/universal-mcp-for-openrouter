import { describe, it, expect, vi, beforeEach } from "vitest";

// Set environment variable BEFORE importing the module that uses it at top level
vi.stubEnv("OPENROUTER_API_KEY", "sk-test-key");

import { registerChatTools } from "../../src/tools/chat.js";
import { ServerContext } from "../../src/types.js";
import { AxiosInstance } from "axios";

describe("Chat & Model Intelligence (#1)", () => {
  let mockCtx: ServerContext;
  let mockAxios: any;

  beforeEach(() => {
    mockAxios = {
      post: vi.fn(),
      get: vi.fn(),
    };

    mockCtx = {
      axiosInstance: mockAxios as unknown as AxiosInstance,
      rateLimiterConfig: { max_dollars: 10, warn_at_percent: 80, max_requests_per_minute: 20 },
      sessionUsage: { prompt_tokens: 0, completion_tokens: 0, cost: 0 },
      circuitBreakerMap: new Map(),
      tokenBucketMap: new Map(),
      pricingCache: {
        "anthropic/claude-3.5-sonnet": { prompt: "0.000003", completion: "0.000015" },
        "meta-llama/llama-3.1-8b-instruct": { prompt: "0.000001", completion: "0.000001" }
      },
    };
  });

  it("chat_completion should call OpenRouter and return text", async () => {
    const { handlers } = registerChatTools(mockCtx);
    
    mockAxios.post.mockResolvedValue({
      data: {
        model: "anthropic/claude-3.5-sonnet",
        choices: [{ message: { content: "Hello from Claude!" } }],
        usage: { prompt_tokens: 10, completion_tokens: 20 }
      }
    });

    const result = await handlers.chat_completion({
      model: "anthropic/claude-3.5-sonnet",
      prompt: "Hi"
    });

    expect(mockAxios.post).toHaveBeenCalled();
    expect(result.content[result.content.length - 2].text).toContain("Hello from Claude!");
    expect(mockCtx.sessionUsage.prompt_tokens).toBe(10);
  });

  it("chat_with_preset should use a defined model preset", async () => {
    const { handlers } = registerChatTools(mockCtx);
    
    mockAxios.post.mockResolvedValue({
      data: {
        model: "anthropic/claude-3.5-sonnet",
        choices: [{ message: { content: "Coding is fun!" } }],
        usage: { prompt_tokens: 5, completion_tokens: 10 }
      }
    });

    const result = await handlers.chat_with_preset({
      preset: "coder",
      prompt: "Write a function"
    });

    expect(mockAxios.post).toHaveBeenCalled();
    expect(result.content[0].text).toContain("Coding is fun!");
  });

  it("recommend_model should return a model recommendation", async () => {
    const { handlers } = registerChatTools(mockCtx);
    
    const mockRecommendation = JSON.stringify({
      recommended_preset: "fast",
      reasoning: "Because you need high speed."
    });

    mockAxios.post.mockResolvedValue({
      data: {
        model: "meta-llama/llama-3.1-8b-instruct",
        choices: [{ message: { content: mockRecommendation } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 }
      }
    });

    const result = await handlers.recommend_model({
      task: "High speed data processing"
    });

    expect(result.content[0].text).toContain("fast");
    expect(result.content[1].text).toContain("Because you need high speed.");
  });

  it("optimize_prompt should return an improved prompt", async () => {
    const { handlers } = registerChatTools(mockCtx);
    
    const mockOptimized = JSON.stringify({
      optimized_prompt: "ACT AS AN EXPERT...",
      improvements: ["Added role", "Clarified goals"]
    });

    mockAxios.post.mockResolvedValue({
      data: {
        model: "anthropic/claude-3.5-sonnet",
        choices: [{ message: { content: mockOptimized } }],
        usage: { prompt_tokens: 10, completion_tokens: 10 }
      }
    });

    const result = await handlers.optimize_prompt({
      prompt: "make it good"
    });

    expect(result.content[0].text).toContain("ACT AS AN EXPERT");
    expect(result.content[1].text).toContain("Added role");
  });

  it("should handle API errors gracefully", async () => {
    const { handlers } = registerChatTools(mockCtx);
    
    mockAxios.post.mockRejectedValue({
      response: { data: { error: { message: "Invalid API Key" } } }
    });

    const result = await handlers.chat_completion({
      model: "invalid-model",
      prompt: "Hi"
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid API Key");
  });
});
