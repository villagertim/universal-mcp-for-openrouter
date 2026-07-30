// SPDX-License-Identifier: MIT

import { AxiosInstance } from "axios";

// ============================================================================
// Tool & Module Type Definitions
// ============================================================================

export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export type ToolHandler = (args: any) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>;

export interface ToolModule {
  name?: string;
  tools: Tool[];
  handlers: Record<string, ToolHandler>;
}

// ============================================================================
// OpenRouter API Response Types
// ============================================================================

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens?: number;
  cost: number;
}

export interface OpenRouterPricing {
  prompt: string;
  completion: string;
  image?: string;
  request?: string;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number;
  pricing: OpenRouterPricing;
}

export interface ModelsResponse {
  data: OpenRouterModel[];
}

export interface ChatCompletionChoice {
  message: {
    role: string;
    content: string;
  };
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: ChatCompletionChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface EmbeddingData {
  embedding: number[];
  index: number;
}

export interface EmbeddingResponse {
  data: EmbeddingData[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// ============================================================================
// Internal State Types
// ============================================================================

export interface ContextEntry {
  id: string;
  text: string;
  tag: string;
  embedding: number[];
  timestamp: string;
  project?: string;
  // Code-chunk fields
  embedding_model?: string;
  file?: string;
  start_line?: number;
  end_line?: number;
  hash?: string;
}

export interface RateLimiterConfig {
  max_dollars: number;
  warn_at_percent: number;
  max_requests_per_minute: number;
  disable_failover?: boolean;
  fallback_price_multiplier?: number;
}

export interface CircuitBreakerState {
  failures: number;
  open_until: number;
}

export interface TokenBucketState {
  tokens: number;
  last_refill: number;
}

export interface ServerContext {
  axiosInstance: AxiosInstance;
  rateLimiterConfig: RateLimiterConfig;
  sessionUsage: Usage;
  circuitBreakerMap: Map<string, CircuitBreakerState>;
  tokenBucketMap: Map<string, TokenBucketState>;
  pricingCache: Record<string, OpenRouterPricing>;
  modelsCache?: OpenRouterModel[];
}

// ============================================================================
// Tool Argument Types
// ============================================================================

export interface ChatCompletionArgs {
  model?: string;
  models?: string[];
  prompt: string;
  system_prompt?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatWithPresetArgs {
  preset: "smart" | "cheap" | "creative" | "fast" | "coder";
  prompt: string;
  system_prompt?: string;
}

export interface ChatRoutedArgs {
  prompt: string;
  system_prompt?: string;
  task_category?: "general" | "code" | "creative" | "vision";
  max_usd_price_per_1m_prompt?: number;
  require_vision?: boolean;
  strictness?: "cost" | "quality";
}

export interface RecommendModelArgs {
  task: string;
}

export interface OptimizePromptArgs {
  prompt: string;
  target_model?: string;
}

export interface VisionAnalyzeArgs {
  image_path?: string;
  image_url?: string;
  prompt?: string;
  model?: string;
}

export interface PinContextArgs {
  text: string;
  tag?: string;
  project?: string;
}

export interface RetrieveContextArgs {
  query: string;
  top_k?: number;
  tag?: string;
  project?: string;
}

export interface ClearContextArgs {
  tag?: string;
  project?: string;
  confirm_wipe_all?: boolean;
}

export interface IndexProjectArgs {
  project_path: string;
  project_name: string;
}

export interface SearchSymbolsArgs {
  query: string;
}

export interface ReindexProjectArgs {
  project_name: string;
  max_chunks?: number;
}

export interface SemanticCodeSearchArgs {
  query: string;
  repos?: string[];
  top_k?: number;
  file_pattern?: string;
}

export interface CorrelateErrorsArgs {
  logs: Array<{
    system_name: string;
    content: string;
  }>;
}

export interface DependencyGraphArgs {
  repos?: string[];
  check_conflicts?: boolean;
  include_dev?: boolean;
  transitive?: boolean;
  focus_package?: string;
  max_depth?: number;
}

export interface SymbolEntry {
  name: string;
  file: string;
  project: string;
  line: number;
}

export interface SymbolIndex {
  [projectName: string]: {
    path: string;
    symbols: SymbolEntry[];
    lastIndexed: string;
  };
}

export interface PackageMapEntry {
  repo: string;
  version_range: string;
  manifest: string;
}

export interface RepoInfo {
  type: "npm" | "cargo" | "yarn" | "pnpm" | "unknown" | "npm (lockfile)" | "cargo (lockfile)" | "yarn (lockfile)" | "pnpm (lockfile)";
  displayName: string;
  depCount?: number;
  stubbed?: boolean;
}

export interface SetBudgetArgs {
  max_dollars?: number;
  warn_at_percent?: number;
}

export interface ChatEnsembleArgs {
  models: string[];
  prompt: string;
  system_prompt?: string;
  synthesizer_model?: string;
  temperature?: number;
  max_tokens?: number;
}
