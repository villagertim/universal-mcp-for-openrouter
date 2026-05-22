// SPDX-License-Identifier: MIT

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { 
  ServerContext, 
  ChatCompletionArgs, 
  ChatWithPresetArgs, 
  RecommendModelArgs, 
  OptimizePromptArgs,
  ChatEnsembleArgs,
} from "../types.js";
import { PRESETS, DEFAULT_SYNTHESIZER_MODEL } from "../config.js";
import { guardedCompletionPost, checkPessimisticBudget } from "../helpers/rate-guard.js";
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
    },
    {
      name: "chat_ensemble",
      description: "Generate a consensus completion by querying multiple distinct models in parallel and synthesizing their responses using a synthesizer model.",
      inputSchema: {
        type: "object",
        properties: {
          models: {
            type: "array",
            items: { type: "string" },
            description: "The list of models to query in parallel (maximum 5, e.g., ['deepseek/deepseek-chat', 'anthropic/claude-3.5-sonnet'])"
          },
          prompt: {
            type: "string",
            description: "The main prompt to send to all models"
          },
          system_prompt: {
            type: "string",
            description: "Optional system prompt for candidate models"
          },
          synthesizer_model: {
            type: "string",
            description: "The model used to merge and optimize outputs (e.g., 'google/gemini-1.5-pro')"
          },
          temperature: {
            type: "number",
            description: "Sampling temperature (0-2)",
            default: 0.7
          },
          max_tokens: {
            type: "number",
            description: "Maximum tokens to generate for candidate outputs"
          }
        },
        required: ["models", "prompt"]
      }
    }
  ];

  return {
    tools,
    handlers: {
      chat_completion: handleChatCompletion,
      chat_with_preset: handleChatWithPreset,
      recommend_model: handleRecommendModel,
      optimize_prompt: handleOptimizePrompt,
      chat_ensemble: handleChatEnsemble,
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

  async function handleChatEnsemble(args: ChatEnsembleArgs) {
    const { 
      models, 
      prompt, 
      system_prompt, 
      synthesizer_model = DEFAULT_SYNTHESIZER_MODEL, 
      temperature = 0.7, 
      max_tokens 
    } = args;

    if (!OPENROUTER_API_KEY) {
      return {
        content: [{ type: "text", text: "Error: OPENROUTER_API_KEY is not configured." }],
        isError: true,
      };
    }

    if (!models || !Array.isArray(models) || models.length === 0) {
      return {
        content: [{ type: "text", text: "Error: The 'models' parameter must be a non-empty array of strings." }],
        isError: true,
      };
    }

    if (models.length > 5) {
      return {
        content: [{ type: "text", text: "Error: Maximum of 5 concurrent target models is permitted." }],
        isError: true,
      };
    }

    // 1. Pessimistic Budget Reservation
    const budgetRes = checkPessimisticBudget(ctx, [...models, synthesizer_model], max_tokens);
    if (!budgetRes.allowed) {
      return {
        content: [{ type: "text", text: budgetRes.message || "Budget reservation rejected." }],
        isError: true,
      };
    }

    console.error(`[Ensemble] 🚀 Starting multi-model consensus query:`);
    console.error(`[Ensemble] Candidates: ${models.join(", ")}`);
    console.error(`[Ensemble] Synthesizer: ${synthesizer_model}`);

    // 2. Parallel Requests
    const messages: any[] = [];
    if (system_prompt) {
      messages.push({ role: "system", content: system_prompt });
    }
    messages.push({ role: "user", content: prompt });

    const promises = models.map(async (m) => {
      const start = Date.now();
      const response = await guardedCompletionPost(ctx, m, {
        model: m,
        messages,
        temperature,
        max_tokens
      });
      const duration = Date.now() - start;
      const content = response.data.choices[0].message.content;
      const actualModel = response.data.model;
      const usage = response.data.usage;
      trackUsage(ctx, actualModel, usage);
      return { model: m, actualModel, content, duration, success: true };
    });

    const results = await Promise.allSettled(promises);

    const successfulCandidates = [];
    const failedCandidates = [];

    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      const modelName = models[i];
      if (res.status === "fulfilled") {
        successfulCandidates.push(res.value);
      } else {
        const errorMsg = res.reason.message || String(res.reason);
        failedCandidates.push({ model: modelName, error: errorMsg });
        console.error(`[Ensemble] ⚠️ Model candidate "${modelName}" failed: ${errorMsg}`);
      }
    }

    if (successfulCandidates.length === 0) {
      const summary = failedCandidates.map(f => `[${f.model}]: ${f.error}`).join("; ");
      return {
        content: [{ type: "text", text: `Error: All ensemble candidate requests failed. Details: ${summary}` }],
        isError: true,
      };
    }

    // 3. Synthesis Prompt Formulation
    let candidateBlocksText = "";
    for (const cand of successfulCandidates) {
      candidateBlocksText += `\n\n=== RESPONSE FROM MODEL: ${cand.actualModel} (Latency: ${cand.duration}ms) ===\n${cand.content}\n================================================`;
    }

    const synthesisSystemInstructions = `You are a world-class Consensus Synthesizer and Expert Technical Peer Reviewer.
Your task is to review responses from multiple AI models, critique them, and generate a single, highly refined, optimal consensus response.

Strict Grounding Rules:
- Base your synthesized output strictly on the provided candidate model responses.
- Extract correct source code blocks, logical strategies, and valid claims.
- Do NOT introduce unverified claims, external hallucinations, or incorrect facts.
- Highlight any discrepancies among model outputs and resolve them logically using the most sound technical approach.`;

    const synthesisUserPrompt = `Original Task Prompt:
"""
${prompt}
"""

${system_prompt ? `Original System Prompt:\n"""\n${system_prompt}\n"""\n` : ""}

We received the following candidate model responses for this task:${candidateBlocksText}

Synthesize these outputs into a single, high-quality, fully optimal response according to the Strict Grounding Rules. Provide the final consensus answer directly.`;

    // 4. Run Synthesis Completion
    console.error(`[Ensemble] 🔄 Merging and synthesizing consensus via "${synthesizer_model}"...`);
    let finalSynthesizedText = "";
    let usedSynthesizer = synthesizer_model;

    try {
      const synthResponse = await guardedCompletionPost(ctx, synthesizer_model, {
        model: synthesizer_model,
        messages: [
          { role: "system", content: synthesisSystemInstructions },
          { role: "user", content: synthesisUserPrompt }
        ],
        temperature: 0.3
      });
      finalSynthesizedText = synthResponse.data.choices[0].message.content;
      usedSynthesizer = synthResponse.data.model;
      trackUsage(ctx, usedSynthesizer, synthResponse.data.usage);
    } catch (synthError: any) {
      console.error(`[Ensemble] 🔴 Synthesizer "${synthesizer_model}" failed: ${synthError.message}`);
      return {
        content: [{ type: "text", text: `Error: Synthesizer model failed to merge outputs. Details: ${synthError.message}` }],
        isError: true,
      };
    }

    // 5. Construct Structured Markdown Response
    const responseContent = [];

    if (failedCandidates.length > 0) {
      const failuresString = failedCandidates.map(f => `* **${f.model}**: ${f.error}`).join("\n");
      responseContent.push({ 
        type: "text", 
        text: `⚠️ **Partial Ensemble Failure Warning:**\nSome candidate models failed during parallel execution. Synthesis proceeded using the remaining successful candidates:\n${failuresString}\n\n---` 
      } as const);
    }

    responseContent.push({ type: "text", text: finalSynthesizedText } as const);

    const successMeta = successfulCandidates.map(s => `* **${s.actualModel}** (Success, Latency: ${s.duration}ms)`).join("\n");
    responseContent.push({ 
      type: "text", 
      text: `\n\n---\n### Ensemble Synthesis Metadata\n* **Synthesizer:** ${usedSynthesizer}\n* **Contributing Models:**\n${successMeta}` 
    } as const);

    let accordionsText = "\n\n<details>\n<summary>🔍 View Original Candidate Responses</summary>";
    for (const cand of successfulCandidates) {
      accordionsText += `\n\n### Original Output from **${cand.actualModel}**:\n\`\`\`markdown\n${cand.content}\n\`\`\n`;
    }
    accordionsText += "\n</details>";
    responseContent.push({ type: "text", text: accordionsText } as const);

    console.error(`[Ensemble] ✅ Consensus execution successfully completed.`);
    return { content: responseContent };
  }
}
