import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

// Shared Infrastructure
import { ServerContext } from "./types.js";
import { DEFAULT_RATE_CONFIG, OPENROUTER_BASE_URL, USER_ENV_PATH, ROOT_DIR } from "./config.js";
import { refreshPricingCache } from "./helpers/pricing.js";
import { loadRateConfig } from "./helpers/config-store.js";
import { loadToolConfig, ToolConfig } from "./helpers/config-loader.js";

// Tool Modules
import { registerChatTools } from "./tools/chat.js";
import { registerModelTools } from "./tools/models.js";
import { registerAccountTools } from "./tools/account.js";
import { registerVisionTools } from "./tools/vision.js";
import { registerContextTools } from "./tools/context.js";
import { registerCodeTools } from "./tools/code.js";
import { registerAnalysisTools } from "./tools/analysis.js";
import { registerBudgetTools } from "./tools/budget.js";

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
        },
      }
    );

    const axiosInstance = axios.create({
      baseURL: OPENROUTER_BASE_URL,
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
      await this.server.close();
      process.exit(0);
    });
  }

  private async initialize() {
    // 1. Load persisted rate config
    try {
      this.ctx.rateLimiterConfig = await loadRateConfig();
    } catch {}

    // 2. Load tool configuration (profile)
    const { config, profileName } = await loadToolConfig();
    
    // 3. Setup handlers
    this.setupHandlers(config, profileName);

    // 4. Background tasks
    refreshPricingCache(this.ctx);
  }

  private setupHandlers(config: ToolConfig, profileName: string) {
    // Collect tools and handlers from all modules
    const allModules = [
      registerChatTools(this.ctx),
      registerModelTools(this.ctx),
      registerAccountTools(this.ctx),
      registerVisionTools(this.ctx),
      registerContextTools(this.ctx),
      registerCodeTools(this.ctx),
      registerAnalysisTools(this.ctx),
      registerBudgetTools(this.ctx),
    ];

    const enabledTools: any[] = [];
    const enabledHandlers: Record<string, Function> = {};
    const disabledToolNames: string[] = [];

    for (const mod of allModules) {
      for (const tool of mod.tools) {
        const isEnabled = config[tool.name] !== false;
        if (isEnabled) {
          enabledTools.push(tool);
          enabledHandlers[tool.name] = (mod.handlers as any)[tool.name];
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
  }

  async run() {
    await this.initialize();
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const server = new OpenRouterServer();
server.run().catch(console.error);
