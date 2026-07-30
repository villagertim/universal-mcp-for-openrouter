// SPDX-License-Identifier: MIT

import fs from "fs/promises";
import path from "path";
import { ROOT_DIR } from "../config.js";
import { ServerContext } from "../types.js";

export interface PromptDefinition {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
}

export function registerPrompts(ctx: ServerContext) {
  const prompts: PromptDefinition[] = [
    {
      name: "cost-aware-orchestration",
      description: "Instructs AI agents to manage API consumption costs, check credit levels, and use budget-safe model routing.",
      arguments: [
        {
          name: "max_budget",
          description: "Target session budget cap in USD (e.g. 5.00)",
          required: false,
        },
      ],
    },
    {
      name: "multi-model-consensus",
      description: "Configures parallel multi-model peer review and consensus voting across up to 5 models.",
      arguments: [
        {
          name: "target_task",
          description: "Description of code or security audit task to review",
          required: false,
        },
      ],
    },
    {
      name: "autonomous-budget-safety",
      description: "Strict financial circuit breaker and loop-stall prevention policy for autonomous background executions.",
    },
    {
      name: "distributed-diagnostics",
      description: "Instructs agents on multi-service log correlation, trace isolation, and cascading fault analysis.",
    },
    {
      name: "workspace-memory-pinning",
      description: "Teaches agents to persistently pin architectural decisions, domain constraints, and workspace memory.",
    },
  ];

  async function getPrompt(name: string, args?: Record<string, string>): Promise<{
    description?: string;
    messages: Array<{
      role: "user" | "assistant";
      content: { type: "text"; text: string };
    }>;
  }> {
    const templatesDir = path.join(ROOT_DIR, "templates", "system-prompt-addendums");

    const fileMap: Record<string, string> = {
      "cost-aware-orchestration": "1-cost-aware-orchestration.md",
      "multi-model-consensus": "11-multi-model-consensus.md",
      "autonomous-budget-safety": "5-autonomous-loop-budget-safety.md",
      "distributed-diagnostics": "4-distributed-diagnostics.md",
      "workspace-memory-pinning": "6-workspace-memory-pinning.md",
    };

    const fileName = fileMap[name];
    if (!fileName) {
      throw new Error(`Prompt template not found: ${name}`);
    }

    let textContent = "";
    try {
      const filePath = path.join(templatesDir, fileName);
      textContent = await fs.readFile(filePath, "utf-8");
    } catch {
      textContent = `Default policy prompt template for ${name}`;
    }

    if (args) {
      for (const [key, val] of Object.entries(args)) {
        textContent = textContent.replaceAll(`{{${key}}}`, val);
      }
    }

    return {
      description: prompts.find((p) => p.name === name)?.description,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: textContent,
          },
        },
      ],
    };
  }

  return {
    prompts,
    getPrompt,
  };
}
