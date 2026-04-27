import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerCodeTools } from "../../src/tools/code.js";
import { registerVisionTools } from "../../src/tools/vision.js";
import { ServerContext } from "../../src/types.js";
import { AxiosInstance } from "axios";
import os from "os";
import path from "path";

describe("Security & Authentication (#8)", () => {
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
  });

  it("should prevent indexing sensitive directories like ~/.ssh", async () => {
    const { handlers } = registerCodeTools(mockCtx);
    const sshPath = path.join(os.homedir(), ".ssh");

    const result = await handlers.index_project({
      project_path: sshPath,
      project_name: "hacker-prj"
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Access denied");
  });

  it("should prevent analyzing sensitive files in vision tools", async () => {
    const { handlers } = registerVisionTools(mockCtx);
    const shadowPath = "/etc/shadow";

    const result = await handlers.vision_analyze({
      image_path: shadowPath,
      prompt: "What's in this?"
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Access denied");
  });

  it("should block subdirectories of restricted paths", async () => {
    const { handlers } = registerCodeTools(mockCtx);
    const sshKeyPath = path.join(os.homedir(), ".ssh/id_rsa");

    const result = await handlers.index_project({
      project_path: sshKeyPath,
      project_name: "hacker-prj"
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Access denied");
  });
});
