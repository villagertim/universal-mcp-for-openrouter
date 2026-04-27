import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerContextTools } from "../../src/tools/context.js";
import { ServerContext } from "../../src/types.js";
import { AxiosInstance } from "axios";
import * as embeddings from "../../src/helpers/embeddings.js";
import * as contextStore from "../../src/helpers/context-store.js";

// Mock helpers
vi.mock("../src/helpers/embeddings.js");
vi.mock("../src/helpers/context-store.js");

describe("Semantic Memory (#5)", () => {
  let mockCtx: ServerContext;
  let mockAxios: any;

  beforeEach(() => {
    mockAxios = { post: vi.fn() };
    mockCtx = {
      axiosInstance: mockAxios as unknown as AxiosInstance,
      rateLimiterConfig: { max_dollars: 10, warn_at_percent: 80, max_requests_per_minute: 20 },
      sessionUsage: { prompt_tokens: 0, completion_tokens: 0, cost: 0 },
      circuitBreakerMap: new Map(),
      tokenBucketMap: new Map(),
      pricingCache: {},
    };
    
    vi.clearAllMocks();
  });

  it("pin_context should generate embedding and save to store", async () => {
    const { handlers } = registerContextTools(mockCtx);
    
    vi.mocked(embeddings.getEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(contextStore.loadContextStore).mockResolvedValue([]);
    vi.mocked(contextStore.saveContextStore).mockResolvedValue(Promise.resolve());

    const result = await handlers.pin_context({
      text: "The secret code is 1234",
      tag: "secrets"
    });

    expect(embeddings.getEmbedding).toHaveBeenCalledWith(mockCtx, "The secret code is 1234");
    expect(contextStore.saveContextStore).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ text: "The secret code is 1234", tag: "secrets" })
    ]));
    expect(result.content[0].text).toContain("Context pinned");
  });

  it("retrieve_context should find similar items based on embedding", async () => {
    const { handlers } = registerContextTools(mockCtx);
    
    const fakeStore = [
      { id: "1", text: "Apples are red", embedding: [1, 0, 0], tag: "general" },
      { id: "2", text: "Bananas are yellow", embedding: [0, 1, 0], tag: "general" }
    ];

    vi.mocked(contextStore.loadContextStore).mockResolvedValue(fakeStore as any);
    vi.mocked(embeddings.getEmbedding).mockResolvedValue([0.9, 0.1, 0]); // Close to apples
    vi.mocked(embeddings.cosineSimilarity).mockImplementation((a, b) => {
      // Trivial dot product for mock
      return a.reduce((sum, val, i) => sum + val * b[i], 0);
    });

    const result = await handlers.retrieve_context({
      query: "fruit color"
    });

    expect(result.content[0].text).toContain("Apples are red");
    expect(result.content[0].text).toContain("0.9000"); // Score
  });

  it("clear_context should remove entries by tag", async () => {
    const { handlers } = registerContextTools(mockCtx);
    
    const fakeStore = [
      { id: "1", text: "Keep me", tag: "keep" },
      { id: "2", text: "Delete me", tag: "delete" }
    ];

    vi.mocked(contextStore.loadContextStore).mockResolvedValue(fakeStore as any);
    vi.mocked(contextStore.saveContextStore).mockResolvedValue(Promise.resolve());

    const result = await handlers.clear_context({
      tag: "delete"
    });

    expect(contextStore.saveContextStore).toHaveBeenCalledWith([fakeStore[0]]);
    expect(result.content[0].text).toContain("Cleared matching entries");
  });

  it("clear_context should wipe all if confirmed", async () => {
    const { handlers } = registerContextTools(mockCtx);
    
    vi.mocked(contextStore.loadContextStore).mockResolvedValue([{ id: "1" }] as any);
    vi.mocked(contextStore.saveContextStore).mockResolvedValue(Promise.resolve());

    const result = await handlers.clear_context({
      confirm_wipe_all: true
    });

    expect(contextStore.saveContextStore).toHaveBeenCalledWith([]);
    expect(result.content[0].text).toContain("Wiped all");
  });
});
