import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerResources } from "../../src/resources/index.js";
import { ServerContext } from "../../src/types.js";
import { AxiosInstance } from "axios";
import * as contextStore from "../../src/helpers/context-store.js";

vi.mock("../../src/helpers/context-store.js");

describe("MCP Native Resources (Phase 1)", () => {
  let mockCtx: ServerContext;
  let mockAxios: any;

  beforeEach(() => {
    mockAxios = { get: vi.fn() };
    mockCtx = {
      axiosInstance: mockAxios as unknown as AxiosInstance,
      rateLimiterConfig: { max_dollars: 10, warn_at_percent: 80, max_requests_per_minute: 20 },
      sessionUsage: { prompt_tokens: 100, completion_tokens: 50, cost: 0.05 },
      circuitBreakerMap: new Map(),
      tokenBucketMap: new Map(),
      pricingCache: {
        "google/gemini-1.5-flash": { prompt: "0.00001", completion: "0.00003" },
      },
    };

    vi.clearAllMocks();
  });

  it("should list available MCP resources", () => {
    const { resources } = registerResources(mockCtx);

    expect(resources.length).toBe(4);
    expect(resources.map((r) => r.uri)).toContain("openrouter://models");
    expect(resources.map((r) => r.uri)).toContain("openrouter://budget/status");
    expect(resources.map((r) => r.uri)).toContain("openrouter://account/balance");
    expect(resources.map((r) => r.uri)).toContain("openrouter://memory/all");
  });

  it("should read openrouter://models resource", async () => {
    const { readResource } = registerResources(mockCtx);
    const result = await readResource("openrouter://models");

    expect(result.contents[0].mimeType).toBe("application/json");
    const data = JSON.parse(result.contents[0].text);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].id).toBe("google/gemini-1.5-flash");
  });

  it("should read openrouter://budget/status resource", async () => {
    const { readResource } = registerResources(mockCtx);
    mockCtx.circuitBreakerMap.set("flaky-model", { failures: 3, open_until: Date.now() + 60000 });

    const result = await readResource("openrouter://budget/status");

    expect(result.contents[0].mimeType).toBe("application/json");
    const data = JSON.parse(result.contents[0].text);
    expect(data.session_cost).toBe("$0.0500");
    expect(data.max_dollars).toBe("$10.00");
    expect(data.active_circuit_breakers["flaky-model"]).toContain("OPEN");
  });

  it("should read openrouter://account/balance resource", async () => {
    mockAxios.get.mockResolvedValue({
      data: { data: { total_credits: 50.0, total_usage: 12.5 } },
    });

    const { readResource } = registerResources(mockCtx);
    const result = await readResource("openrouter://account/balance");

    expect(mockAxios.get).toHaveBeenCalledWith("/credits");
    const data = JSON.parse(result.contents[0].text);
    expect(data.total_credits).toBe(50.0);
  });

  it("should read openrouter://memory/all resource", async () => {
    const fakeStore = [
      { text: "Use JWT tokens", tag: "decision", project: "auth" },
    ];
    vi.mocked(contextStore.loadContextStore).mockResolvedValue(fakeStore as any);

    const { readResource } = registerResources(mockCtx);
    const result = await readResource("openrouter://memory/all");

    const data = JSON.parse(result.contents[0].text);
    expect(data.length).toBe(1);
    expect(data[0].text).toBe("Use JWT tokens");
  });
});
