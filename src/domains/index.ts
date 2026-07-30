// SPDX-License-Identifier: MIT

import { ServerContext, ToolModule } from "../types.js";

// Tool Modules
import { registerChatTools } from "../tools/chat.js";
import { registerModelTools } from "../tools/models.js";
import { registerAccountTools } from "../tools/account.js";
import { registerVisionTools } from "../tools/vision.js";
import { registerContextTools } from "../tools/context.js";
import { registerCodeTools } from "../tools/code.js";
import { registerAnalysisTools } from "../tools/analysis.js";
import { registerBudgetTools } from "../tools/budget.js";
import { registerVerifyTools } from "../tools/verify.js";

// Native Primitives
import { registerResources } from "../resources/index.js";
import { registerPrompts } from "../prompts/index.js";

export function registerDomainModules(ctx: ServerContext) {
  const domains = {
    gateway: [
      registerChatTools(ctx),
      registerModelTools(ctx),
      registerAccountTools(ctx),
      registerBudgetTools(ctx),
      registerVisionTools(ctx),
    ],
    intelligence: [
      registerCodeTools(ctx),
      registerContextTools(ctx),
    ],
    diagnostics: [
      registerAnalysisTools(ctx),
      registerVerifyTools(ctx),
    ],
  };

  const allToolModules: ToolModule[] = [
    ...domains.gateway,
    ...domains.intelligence,
    ...domains.diagnostics,
  ];

  const resourceModule = registerResources(ctx);
  const promptModule = registerPrompts(ctx);

  return {
    domains,
    allToolModules,
    resourceModule,
    promptModule,
  };
}
