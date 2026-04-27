import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerVisionTools } from "../src/tools/vision.js";
import { ServerContext } from "../src/types.js";
import { AxiosInstance } from "axios";
import fs from "fs/promises";

// Mock fs/promises
vi.mock("fs/promises");

describe("Vision Capabilities (#4)", () => {
  let mockCtx: ServerContext;
  let mockAxios: any;

  beforeEach(() => {
    mockAxios = {
      post: vi.fn(),
    };

    mockCtx = {
      axiosInstance: mockAxios as unknown as AxiosInstance,
      rateLimiterConfig: { max_dollars: 10, warn_at_percent: 80, max_requests_per_minute: 20 },
      sessionUsage: { prompt_tokens: 0, completion_tokens: 0, cost: 0 },
      circuitBreakerMap: new Map(),
      tokenBucketMap: new Map(),
      pricingCache: {
        "google/gemini-flash-1.5": { prompt: "0.0000001", completion: "0.0000003" }
      },
    };
    
    vi.clearAllMocks();
  });

  it("vision_analyze should handle image URLs", async () => {
    const { handlers } = registerVisionTools(mockCtx);
    
    mockAxios.post.mockResolvedValue({
      data: {
        model: "google/gemini-flash-1.5",
        choices: [{ message: { content: "I see a blue sky." } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 }
      }
    });

    const result = await handlers.vision_analyze({
      image_url: "https://example.com/sky.jpg",
      prompt: "What is in the image?"
    });

    expect(mockAxios.post).toHaveBeenCalledWith("/chat/completions", expect.objectContaining({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What is in the image?" },
            { type: "image_url", image_url: { url: "https://example.com/sky.jpg" } }
          ]
        }
      ]
    }));
    expect(result.content[0].text).toContain("blue sky");
  });

  it("vision_analyze should handle local image paths with base64 encoding", async () => {
    const { handlers } = registerVisionTools(mockCtx);
    
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from("fake-image-data"));

    mockAxios.post.mockResolvedValue({
      data: {
        model: "google/gemini-flash-1.5",
        choices: [{ message: { content: "This is a local screenshot." } }],
        usage: { prompt_tokens: 150, completion_tokens: 30 }
      }
    });

    const result = await handlers.vision_analyze({
      image_path: "/tmp/screenshot.png",
      prompt: "Describe the image"
    });

    expect(fs.readFile).toHaveBeenCalledWith("/tmp/screenshot.png");
    expect(mockAxios.post).toHaveBeenCalledWith("/chat/completions", expect.objectContaining({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Describe the image" },
            { type: "image_url", image_url: { url: expect.stringContaining("data:image/png;base64,") } }
          ]
        }
      ]
    }));
    expect(result.content[0].text).toContain("local screenshot");
  });

  it("should handle missing files gracefully", async () => {
    const { handlers } = registerVisionTools(mockCtx);
    
    vi.mocked(fs.readFile).mockRejectedValue(new Error("File not found"));

    const result = await handlers.vision_analyze({
      image_path: "/non/existent.jpg"
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("File not found");
  });
});
