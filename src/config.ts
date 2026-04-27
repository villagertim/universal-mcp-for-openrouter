import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { RateLimiterConfig } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Root and Data Directories
export const ROOT_DIR = path.join(__dirname, "..");
export const DATA_DIR = ROOT_DIR; // Currently using project root for state JSONs
export const USER_ENV_PATH = path.join(os.homedir(), "dev/.env");

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export const PRESETS: Record<string, string[]> = {
  "smart": ["anthropic/claude-3.5-sonnet", "openai/gpt-4o", "google/gemini-pro-1.5"],
  "cheap": ["meta-llama/llama-3-8b-instruct", "google/gemini-flash-1.5", "deepseek/deepseek-chat"],
  "creative": ["anthropic/claude-3-opus", "openai/gpt-4-turbo", "anthropic/claude-3-5-sonnet"],
  "fast": ["google/gemini-flash-1.5", "meta-llama/llama-3-70b-instruct", "anthropic/claude-3-haiku"],
  "coder": ["anthropic/claude-3.5-sonnet", "deepseek/deepseek-coder", "openai/gpt-4o"],
};

export const DEFAULT_RATE_CONFIG: RateLimiterConfig = {
  max_dollars: 10.00,
  warn_at_percent: 80,
  max_requests_per_minute: 20,
};

// State Paths
export const RATE_CONFIG_PATH = path.join(DATA_DIR, "rate_config.json");
export const SYMBOL_INDEX_PATH = path.join(DATA_DIR, "symbol_index.json");
export const CONTEXT_STORE_PATH = path.join(DATA_DIR, "context_store.json");
export const PROFILES_DIR = path.join(DATA_DIR, "profiles");
export const CONFIG_FILE_PATH = path.join(DATA_DIR, "tools.config.json");

// Code Search Constants
export const CODE_TAG                = "__code__";
export const CODE_EMBEDDING_MODEL    = "openai/text-embedding-3-large";
export const CODE_CHUNK_LINES        = 50;
export const CODE_CHUNK_STRIDE       = 40;
export const CODE_MAX_FILE_BYTES     = 50_000;
export const CODE_DEFAULT_MAX_CHUNKS = 5_000;
export const CODE_SKIP_DIRS   = new Set(["node_modules", ".git", "build", "dist", ".next", "vendor", "__pycache__"]);
export const CODE_SKIP_EXTS   = new Set([".map"]);
export const CODE_SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java"]);
