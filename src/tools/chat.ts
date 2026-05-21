// SPDX-License-Identifier: MIT

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { 
  ServerContext, 
  ChatCompletionArgs, 
  ChatWithPresetArgs, 
  RecommendModelArgs, 
  OptimizePromptArgs,
} from "../types.js";
import { PRESETS } from "../config.js";
import { guardedCompletionPost } from "../helpers/rate-guard.js";
import { trackUsage } from "../helpers/pricing.js";

export function registerChatTools(ctx: ServerContext) {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY?.trim();

  // Definitions
  const tools = [
    {
      name: "chat_completion",
      description: "Generate a chat completion using an OpenRouter model",
      inputSchema: {
        type: "object",
        properties: {
          model: {
            type: "string",
            description: "The primary model to use (e.g., 'anthropic/claude-3-5-sonnet'). Defaults to 'openrouter/auto'.",
            default: "openrouter/auto"
          },
          models: {
            type: "array",
            items: { type: "string" },
            description: "An optional list of fallback models to try in order if the primary model fails."
          },
          prompt: {
            type: "string",
            description: "The prompt to send to the model"
          },
          system_prompt: {
            type: "string",
            description: "Optional system prompt"
          },
          temperature: {
            type: "number",
            description: "Sampling temperature (0-2)",
            default: 0.7
          },
          max_tokens: {
            type: "number",
            description: "Maximum tokens to generate"
          }
        },
        required: ["prompt"]
      },
    },
    {
      name: "chat_with_preset",
      description: "Generate a chat completion using a predefined model preset (smart, cheap, creative, fast, coder)",
      inputSchema: {
        type: "object",
        properties: {
          preset: {
            type: "string",
            enum: ["smart", "cheap", "creative", "fast", "coder"],
            description: "The preset to use"
          },
          prompt: {
            type: "string",
            description: "The prompt to send"
          },
          system_prompt: {
            type: "string",
            description: "Optional system prompt"
          }
        },
        required: ["preset", "prompt"]
      },
    },
    {
      name: "recommend_model",
      description: "Analyze a task and recommend the best model preset (smart, cheap, creative, fast, coder)",
      inputSchema: {
        type: "object",
        properties: {
          task: {
            type: "string",
            description: "The task or prompt you want to analyze"
          }
        },
        required: ["task"]
      },
    },
    {
      name: "optimize_prompt",
      description: "Refine and optimize a draft prompt using best practices for LLMs",
      inputSchema: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "The draft prompt you want to optimize"
          },
          target_model: {
            type: "string",
            description: "The model you intend to use this prompt with (e.g., 'anthropic/claude-3-5-sonnet')"
          }
        },
        required: ["prompt"]
      },
    }
  ];

  return {
    tools,
    handlers: {
      chat_completion: handleChatCompletion,
      chat_with_preset: handleChatWithPreset,
      recommend_model: handleRecommendModel,
      optimize_prompt: handleOptimizePrompt,
    }
  };

  async function handleChatCompletion(args: ChatCompletionArgs) {
    const { model = "openrouter/auto", models, prompt, system_prompt, temperature = 0.7, max_tokens } = args;

    if (!OPENROUTER_API_KEY) {
      return {
        content: [{ type: "text", text: "Error: OPENROUTER_API_KEY is not configured." }],
        isError: true,
      };
    }

    try {
      const messages = [];
      if (system_prompt) {
        messages.push({ role: "system", content: system_prompt });
      }
      messages.push({ role: "user", content: prompt });

      const requestData: any = {
        messages,
        temperature,
        max_tokens,
      };

      if (models && Array.isArray(models)) {
        requestData.models = models;
        requestData.model = model;
      } else {
        requestData.model = model;
      }

      const response = await guardedCompletionPost(ctx, requestData.model || model, requestData);
      const completion: string = response.data.choices[0].message.content;
      const usedModel: string = response.data.model;
      const usage = response.data.usage;

      trackUsage(ctx, usedModel, usage);

      let thinking: string | null = null;
      let answer = completion;
      const thinkMatch = completion.match(/<think>([\s\S]*?)<\/think>/);
      if (thinkMatch) {
        thinking = thinkMatch[1].trim();
        answer = completion.replace(/<think>[\s\S]*?<\/think>/, "").trim();
      }

      const responseContent = [];
      if (thinking) {
        responseContent.push({ type: "text", text: `💭 THINKING:\n${thinking}\n\n---` } as const);
      }
      responseContent.push({ type: "text", text: answer } as const);
      responseContent.push({ type: "text", text: `\n\n(Generated by: ${usedModel})` } as const);

      return { content: responseContent };
    } catch (error: any) {
      console.error("OpenRouter API error:", error.response?.data || error.message);
      return {
        content: [{ type: "text", text: `Error calling OpenRouter: ${error.response?.data?.error?.message || error.message}` }],
        isError: true,
      };
    }
  }

  async function handleChatWithPreset(args: ChatWithPresetArgs) {
    const { preset, prompt, system_prompt } = args;
    const presetModels = PRESETS[preset];
    if (!presetModels) throw new McpError(ErrorCode.InvalidParams, `Unknown preset: ${preset}`);

    return handleChatCompletion({
      model: presetModels[0],
      models: presetModels.slice(1),
      prompt,
      system_prompt
    });
  }

  async function handleRecommendModel(args: RecommendModelArgs) {
    const { task } = args;
    const systemPrompt = `You are an expert AI orchestrator. Recommend a preset (smart, cheap, creative, fast, coder) for this task. Return JSON: { "recommended_preset": "...", "reasoning": "..." }`;
    try {
      const response = await guardedCompletionPost(ctx, "meta-llama/llama-3.1-8b-instruct", {
        model: "meta-llama/llama-3.1-8b-instruct",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `Analyze this task: ${task}` }],
        response_format: { type: "json_object" },
        temperature: 0.1
      });
      trackUsage(ctx, response.data.model, response.data.usage);
      const recommendation = JSON.parse(response.data.choices[0].message.content);
      return {
        content: [
          { type: "text", text: `Recommended Preset: ${recommendation.recommended_preset}` },
          { type: "text", text: `Reasoning: ${recommendation.reasoning}` }
        ],
      };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
  }

  async function handleOptimizePrompt(args: OptimizePromptArgs) {
    const { prompt, target_model = "general" } = args;
    const systemPrompt = `You are an expert Prompt Engineer. Rewrite this prompt to be high-performing. Return JSON: { "optimized_prompt": "...", "improvements": ["..."] }`;
    try {
      const response = await guardedCompletionPost(ctx, "anthropic/claude-3.5-sonnet", {
        model: "anthropic/claude-3.5-sonnet",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `Optimize: ${prompt}` }],
        response_format: { type: "json_object" }
      });
      trackUsage(ctx, response.data.model, response.data.usage);
      const result = JSON.parse(response.data.choices[0].message.content);
      return {
        content: [
          { type: "text", text: `✨ OPTIMIZED PROMPT:\n\n${result.optimized_prompt}` },
          { type: "text", text: `\n\n🛠 IMPROVEMENTS:\n- ${result.improvements.join("\n- ")}` }
        ],
      };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
  }
}
