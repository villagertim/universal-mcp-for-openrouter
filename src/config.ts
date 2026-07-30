// SPDX-License-Identifier: MIT

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
  "smart": ["anthropic/claude-opus-4.7", "openai/gpt-5.5", "x-ai/grok-4.20"],
  "cheap": ["openai/gpt-5.4-nano", "qwen/qwen3.7-flash", "google/gemini-3.1-flash-lite"],
  "creative": ["openai/gpt-5.5", "anthropic/claude-sonnet-4.6", "google/gemini-3.1-pro-preview"],
  "fast": ["google/gemini-3.1-flash-lite", "openai/gpt-5.4-nano", "qwen/qwen3.7-flash"],
  "coder": ["anthropic/claude-sonnet-4.6", "openai/gpt-5.4", "qwen/qwen3-coder-next"],
};

export const DEFAULT_RATE_CONFIG: RateLimiterConfig = {
  max_dollars: 10.00,
  warn_at_percent: 80,
  max_requests_per_minute: 20,
  disable_failover: false,
  fallback_price_multiplier: 1.5,
};

export const DEFAULT_SYNTHESIZER_MODEL = "google/gemini-3.1-pro-preview";

// State Paths
export const RATE_CONFIG_PATH = path.join(DATA_DIR, "rate_config.json");
export const SYMBOL_INDEX_PATH = path.join(DATA_DIR, "symbol_index.json");
export const CONTEXT_STORE_PATH = path.join(DATA_DIR, "context_store.json");
export const PRICING_CACHE_PATH = path.join(DATA_DIR, "pricing_cache.json");
export const PROFILES_DIR = path.join(DATA_DIR, "profiles");
export const CONFIG_FILE_PATH = path.join(DATA_DIR, "tools.config.json");

// Code Search Constants
export const CODE_TAG                = "__code__";
export const CODE_EMBEDDING_MODEL    = "openai/text-embedding-3-small";
export const CODE_CHUNK_LINES        = 50;
export const CODE_CHUNK_STRIDE       = 40;
export const CODE_MAX_FILE_BYTES     = 50_000;
export const CODE_DEFAULT_MAX_CHUNKS = 5_000;
export const CODE_SKIP_DIRS   = new Set([
  "node_modules", ".git", "build", "dist", ".next", "vendor", "__pycache__",
  "coverage", ".venv", "target", ".turbo", ".cache", ".output", ".nuxt",
  ".svelte-kit", ".out", "out", ".parcel-cache", ".idea", ".vscode"
]);
export const CODE_SKIP_EXTS   = new Set([".map"]);
export const CODE_SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java"]);
