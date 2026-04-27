import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerCodeTools } from "../../src/tools/code.js";
import { registerAnalysisTools } from "../../src/tools/analysis.js";
import { ServerContext } from "../../src/types.js";
import { AxiosInstance } from "axios";
import fs from "fs/promises";
import path from "path";
import * as embeddings from "../../src/helpers/embeddings.js";
import * as contextStore from "../../src/helpers/context-store.js";
import { SYMBOL_INDEX_PATH } from "../../src/config.js";

// Mock fs/promises
vi.mock("fs/promises");
vi.mock("../../src/helpers/embeddings.js");
vi.mock("../../src/helpers/context-store.js");

describe("Code Intelligence & Analysis (#6)", () => {
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

  it("index_project should scan files and extract symbols", async () => {
    const { handlers } = registerCodeTools(mockCtx);
    
    vi.mocked(fs.readdir).mockResolvedValueOnce([
      { name: "index.ts", isDirectory: () => false } as any
    ]);
    vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
      if (typeof filePath === "string" && filePath.endsWith("index.ts")) {
        return "function test() {}; class MyClass {}";
      }
      if (typeof filePath === "string" && filePath.endsWith("symbol_index.json")) return "{}";
      return "";
    });

    const result = await handlers.index_project({
      project_path: "/test",
      project_name: "test-prj"
    });

    expect(fs.writeFile).toHaveBeenCalled();
    expect(result.content[0].text).toContain("Indexed 2 symbols");
  });

  it("search_symbols should return matches from the index", async () => {
    const { handlers } = registerCodeTools(mockCtx);
    
    const mockIndex = {
      "test-prj": {
        symbols: [
          { name: "myFunc", file: "main.ts", project: "test-prj", line: 10 }
        ]
      }
    };
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockIndex));

    const result = await handlers.search_symbols({ query: "my" });

    expect(result.content[0].text).toContain("Found 1 symbols");
    expect(result.content[0].text).toContain("myFunc");
  });

  it("semantic_code_search should use embeddings to find relevant snippets", async () => {
    const { handlers } = registerCodeTools(mockCtx);
    
    const fakeStore = [
      { tag: "__code__", text: "function log() {}", embedding: [1, 0], file: "logger.ts", project: "prj" }
    ];
    vi.mocked(contextStore.loadContextStore).mockResolvedValue(fakeStore as any);
    vi.mocked(embeddings.getEmbedding).mockResolvedValue([0.99, 0.01]);
    vi.mocked(embeddings.cosineSimilarity).mockReturnValue(0.99);

    const result = await handlers.semantic_code_search({
      query: "how to log"
    });

    expect(result.content[0].text).toContain("function log()");
    expect(result.content[0].text).toContain("logger.ts");
  });

  it("dependency_graph should detect shared dependencies and conflicts", async () => {
    const { handlers } = registerAnalysisTools(mockCtx);
    
    const mockIndex = {
      "prj-a": { path: "/a" },
      "prj-b": { path: "/b" }
    };
    vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
      if (filePath === SYMBOL_INDEX_PATH) return JSON.stringify(mockIndex);
      if (filePath.endsWith("a/package.json")) return JSON.stringify({ name: "a", dependencies: { "lodash": "^4.0.0" } });
      if (filePath.endsWith("b/package.json")) return JSON.stringify({ name: "b", dependencies: { "lodash": "^3.0.0" } });
      return "";
    });

    const result = await handlers.dependency_graph({ check_conflicts: true });

    expect(result.content[0].text).toContain("Analyzed 2 repos");
    expect(result.content[0].text).toContain("shared packages");
    expect(result.content[0].text).toContain("lodash");
    expect(result.content[0].text).toContain("Semver Conflicts");
  });
});
