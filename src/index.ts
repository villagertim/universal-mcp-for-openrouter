// SPDX-License-Identifier: MIT

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

// Shared Infrastructure
import { ServerContext, Tool, ToolHandler } from "./types.js";
import { DEFAULT_RATE_CONFIG, OPENROUTER_BASE_URL, USER_ENV_PATH, ROOT_DIR } from "./config.js";
import { refreshPricingCache, loadPricingCacheFromDisk } from "./helpers/pricing.js";
import { loadRateConfig } from "./helpers/config-store.js";
import { loadToolConfig, ToolConfig } from "./helpers/config-loader.js";

// Domain Modules & Primitives Orchestration
import { registerDomainModules } from "./domains/index.js";

// Background Watcher Infrastructure
import { initializeWatcher, closeAllWatchers } from "./helpers/watcher.js";

// Redirect all console.log to stderr to prevent corrupting the MCP stdout stream
console.log = (...args) => console.error(...args);

// Load Environment Variables
dotenv.config({ path: path.join(ROOT_DIR, ".env") });
dotenv.config({ path: USER_ENV_PATH });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY?.trim();

if (!OPENROUTER_API_KEY) {
  console.error("Warning: OPENROUTER_API_KEY is not set in environment variables.");
}

class OpenRouterServer {
  private server: Server;
  private ctx: ServerContext;

  constructor() {
    this.server = new Server(
      {
        name: "openrouter-mcp-server",
        version: "1.2.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    const axiosInstance = axios.create({
      baseURL: OPENROUTER_BASE_URL,
      timeout: 60000,
      headers: {
        "authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.SITE_URL || "http://localhost",
        "X-Title": process.env.SITE_NAME || "MCP OpenRouter Server",
        "Content-Type": "application/json",
      },
    });

    this.ctx = {
      axiosInstance,
      rateLimiterConfig: { ...DEFAULT_RATE_CONFIG },
      sessionUsage: { prompt_tokens: 0, completion_tokens: 0, cost: 0 },
      circuitBreakerMap: new Map(),
      tokenBucketMap: new Map(),
      pricingCache: {},
    };

    // Error handling
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      closeAllWatchers();
      await this.server.close();
      process.exit(0);
    });
  }

  private async initialize() {
    // 1. Load persisted rate config
    try {
      this.ctx.rateLimiterConfig = await loadRateConfig();
    } catch (e) {
      console.error("[init] loadRateConfig failed; falling back to defaults:", e instanceof Error ? e.message : e);
    }

    // 2. Load pricing cache from disk
    let isFresh = false;
    try {
      const cacheResult = await loadPricingCacheFromDisk(this.ctx);
      isFresh = cacheResult.isFresh;
    } catch (e) {
      console.error("[init] loadPricingCacheFromDisk failed; continuing with empty cache:", e instanceof Error ? e.message : e);
    }

    // 3. Load tool configuration (profile)
    const { config, profileName } = await loadToolConfig();
    
    // 4. Setup handlers
    this.setupHandlers(config, profileName);

    // 5. Background tasks (conditional refresh based on cache TTL)
    refreshPricingCache(this.ctx, { isFresh });

    // 6. Start real-time incremental watch engine
    initializeWatcher(this.ctx).catch(err => {
      console.error("[Watcher] Startup failed:", err);
    });
  }

  private setupHandlers(config: ToolConfig, profileName: string) {
    const { allToolModules, resourceModule, promptModule } = registerDomainModules(this.ctx);

    const enabledTools: Tool[] = [];
    const enabledHandlers: Record<string, ToolHandler> = {};
    const disabledToolNames: string[] = [];

    for (const mod of allToolModules) {
      for (const tool of mod.tools) {
        const isEnabled = config[tool.name] !== false;
        if (isEnabled) {
          enabledTools.push(tool);
          const handler = mod.handlers[tool.name];
          if (handler) enabledHandlers[tool.name] = handler;
        } else {
          disabledToolNames.push(tool.name);
        }
      }
    }

    console.error(`[MCP] Profile: ${profileName}`);
    console.error(`[MCP] Tools enabled: ${enabledTools.length} / ${enabledTools.length + disabledToolNames.length}`);
    if (disabledToolNames.length > 0) {
      console.error(`[MCP] Disabled: ${disabledToolNames.join(", ")}`);
    }

    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: enabledTools,
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const handler = enabledHandlers[request.params.name];
      if (handler) {
        return await handler(request.params.arguments);
      }
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool or tool disabled: ${request.params.name}`);
    });

    // Register MCP Resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: resourceModule.resources,
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      return await resourceModule.readResource(request.params.uri);
    });

    // Register MCP Prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: promptModule.prompts,
    }));

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      return await promptModule.getPrompt(request.params.name, request.params.arguments as any);
    });
  }

  async run() {
    await this.initialize();
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const server = new OpenRouterServer();
server.run().catch(console.error);
