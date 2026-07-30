import { describe, it, expect, beforeEach } from "vitest";
import { registerPrompts } from "../../src/prompts/index.js";
import { ServerContext } from "../../src/types.js";

describe("MCP Native Prompts (Phase 2)", () => {
  let mockCtx: ServerContext;

  beforeEach(() => {
    mockCtx = {
      axiosInstance: {} as any,
      rateLimiterConfig: { max_dollars: 10, warn_at_percent: 80, max_requests_per_minute: 20 },
      sessionUsage: { prompt_tokens: 0, completion_tokens: 0, cost: 0 },
      circuitBreakerMap: new Map(),
      tokenBucketMap: new Map(),
      pricingCache: {},
    };
  });

  it("should list available MCP prompt templates", () => {
    const { prompts } = registerPrompts(mockCtx);

    expect(prompts.length).toBe(5);
    const names = prompts.map((p) => p.name);
    expect(names).toContain("cost-aware-orchestration");
    expect(names).toContain("multi-model-consensus");
    expect(names).toContain("autonomous-budget-safety");
    expect(names).toContain("distributed-diagnostics");
    expect(names).toContain("workspace-memory-pinning");
  });

  it("should retrieve prompt template content for cost-aware-orchestration", async () => {
    const { getPrompt } = registerPrompts(mockCtx);
    const result = await getPrompt("cost-aware-orchestration");

    expect(result.messages.length).toBe(1);
    expect(result.messages[0].role).toBe("user");
    expect(result.messages[0].content.text).toContain("Cost-Aware & Budget Orchestration");
  });

  it("should retrieve prompt template content for multi-model-consensus", async () => {
    const { getPrompt } = registerPrompts(mockCtx);
    const result = await getPrompt("multi-model-consensus");

    expect(result.messages.length).toBe(1);
    expect(result.messages[0].content.text).toContain("Multi-Model");
  });

  it("should throw error for unknown prompt name", async () => {
    const { getPrompt } = registerPrompts(mockCtx);
    await expect(getPrompt("invalid-prompt-name")).rejects.toThrow("Prompt template not found");
  });
});
