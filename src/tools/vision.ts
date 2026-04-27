import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ServerContext, VisionAnalyzeArgs } from "../types.js";
import { guardedCompletionPost } from "../helpers/rate-guard.js";
import { trackUsage } from "../helpers/pricing.js";
import { getMimeType } from "../helpers/mime.js";
import { validatePath } from "../helpers/path-utils.js";
import fs from "fs/promises";

export function registerVisionTools(ctx: ServerContext) {
  const tools = [
    {
      name: "vision_analyze",
      description: "Analyze an image (local file or URL) using a vision-capable model",
      inputSchema: {
        type: "object",
        properties: {
          image_path: {
            type: "string",
            description: "Local path to the image file (e.g., /path/to/screenshot.png)"
          },
          image_url: {
            type: "string",
            description: "URL of the image to analyze"
          },
          prompt: {
            type: "string",
            description: "What to look for or analyze in the image",
            default: "Describe this image in detail."
          },
          model: {
            type: "string",
            description: "The vision model to use (defaults to google/gemini-flash-1.5)",
            default: "google/gemini-flash-1.5"
          }
        }
      },
    }
  ];

  return {
    tools,
    handlers: {
      vision_analyze: handleVisionAnalyze,
    }
  };

  async function handleVisionAnalyze(args: VisionAnalyzeArgs) {
    const { image_path, image_url, prompt = "Describe this image in detail.", model = "google/gemini-flash-1.5" } = args;
    try {
      let imageUrlToSend = image_url;
      if (image_path) {
        validatePath(image_path);
        const fileData = await fs.readFile(image_path);
        const mimeType = getMimeType(image_path);
        imageUrlToSend = `data:${mimeType};base64,${fileData.toString("base64")}`;
      }
      const response = await guardedCompletionPost(ctx, model, {
        model,
        messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: imageUrlToSend } }] }]
      });
      trackUsage(ctx, response.data.model, response.data.usage);
      return { content: [{ type: "text", text: response.data.choices[0].message.content }, { type: "text", text: `\n\n(Analyzed by: ${response.data.model})` }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.response?.data?.error?.message || error.message}` }], isError: true };
    }
  }
}
