// SPDX-License-Identifier: MIT

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ServerContext, VisionAnalyzeArgs } from "../types.js";
import { guardedCompletionPost } from "../helpers/rate-guard.js";
import { trackUsage } from "../helpers/pricing.js";
import { getMimeType } from "../helpers/mime.js";
import { validatePath, resolveHomePath } from "../helpers/path-utils.js";
import { withErrorHandler } from "../helpers/error-handler.js";
import fs from "fs/promises";

export function registerVisionTools(ctx: ServerContext) {
  const tools = [
    {
      name: "vision_analyze",
      title: "Analyze Image",
      description: "Analyze an image (local file or URL) using a vision-capable model",
      annotations: { openWorldHint: true },
      inputSchema: {
        type: "object",
        properties: {
          image_path: {
            type: "string",
            description: "Local path to the image file (e.g., /path/to/screenshot.png or ~/screenshot.png)"
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
            description: "The vision model to use (defaults to google/gemini-3.1-flash-lite)",
            default: "google/gemini-3.1-flash-lite"
          }
        }
      },
    }
  ];

  return {
    tools,
    handlers: {
      vision_analyze: withErrorHandler("vision_analyze", handleVisionAnalyze),
    }
  };

  async function handleVisionAnalyze(args: VisionAnalyzeArgs) {
    const { image_path, image_url, prompt = "Describe this image in detail.", model = "google/gemini-3.1-flash-lite" } = args;
    let imageUrlToSend = image_url;
    if (image_path) {
      const expandedPath = resolveHomePath(image_path);
      validatePath(expandedPath);
      const fileData = await fs.readFile(expandedPath);
      const mimeType = getMimeType(expandedPath);
      imageUrlToSend = `data:${mimeType};base64,${fileData.toString("base64")}`;
    }
    const response = await guardedCompletionPost(ctx, model, {
      model,
      messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: imageUrlToSend } }] }]
    });
    trackUsage(ctx, response.data.model, response.data.usage);
    return { content: [{ type: "text", text: response.data.choices[0].message.content }, { type: "text", text: `\n\n(Analyzed by: ${response.data.model})` }] };
  }
}
