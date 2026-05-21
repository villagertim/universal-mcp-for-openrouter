// SPDX-License-Identifier: MIT

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { 
  ServerContext, 
  ContextEntry,
  PinContextArgs,
  RetrieveContextArgs,
  ClearContextArgs
} from "../types.js";
import { CODE_TAG } from "../config.js";
import { getEmbedding, cosineSimilarity } from "../helpers/embeddings.js";
import { loadContextStore, saveContextStore } from "../helpers/context-store.js";

export function registerContextTools(ctx: ServerContext) {
  const tools = [
    {
      name: "pin_context",
      description: "Store text with optional tags and project association for semantic retrieval",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "The content to remember" },
          tag: { type: "string", description: "Optional category tag (default: 'general')" },
          project: { type: "string", description: "Optional project identifier" }
        },
        required: ["text"]
      },
    },
    {
      name: "retrieve_context",
      description: "Search for semantically similar information in memory",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "The concept or question to search for" },
          top_k: { type: "number", description: "Number of matches to return (default: 5)" },
          tag: { type: "string", description: "Filter by tag" },
          project: { type: "string", description: "Filter by project" }
        },
        required: ["query"]
      },
    },
    {
      name: "clear_context",
      description: "Delete entries from semantic memory by tag or project",
      inputSchema: {
        type: "object",
        properties: {
          tag: { type: "string", description: "Filter by tag" },
          project: { type: "string", description: "Filter by project" },
          confirm_wipe_all: { type: "boolean", description: "Wipe entire memory" }
        }
      },
    }
  ];

  return {
    tools,
    handlers: {
      pin_context: handlePinContext,
      retrieve_context: handleRetrieveContext,
      clear_context: handleClearContext,
    }
  };

  async function handlePinContext(args: PinContextArgs) {
    const { text, tag = "general", project } = args;
    try {
      const embedding = await getEmbedding(ctx, text);
      const entry: ContextEntry = { id: `ctx_${Date.now()}`, text, tag, embedding, timestamp: new Date().toISOString(), project };
      const store = await loadContextStore();
      store.push(entry);
      await saveContextStore(store);
      return { content: [{ type: "text", text: `📌 Context pinned (ID: ${entry.id})` }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
  }

  async function handleRetrieveContext(args: RetrieveContextArgs) {
    const { query, top_k = 5, tag, project } = args;
    try {
      let store = (await loadContextStore()).filter(e => e.tag !== CODE_TAG);
      if (tag) store = store.filter(e => e.tag === tag);
      if (project) store = store.filter(e => e.project === project);
      if (store.length === 0) return { content: [{ type: "text", text: "No entries." }] };
      const qEmb = await getEmbedding(ctx, query);
      const scored = store.map(e => ({ ...e, score: cosineSimilarity(qEmb, e.embedding) })).sort((a, b) => b.score - a.score).slice(0, top_k);
      const results = scored.map((e, i) => `### ${i + 1} (${e.score.toFixed(4)})\n${e.text}`).join("\n\n");
      return { content: [{ type: "text", text: `🧠 Matches:\n\n${results}` }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
  }

  async function handleClearContext(args: ClearContextArgs) {
    const { tag, project, confirm_wipe_all } = args;
    try {
      let store = await loadContextStore();
      if (confirm_wipe_all && !tag && !project) { await saveContextStore([]); return { content: [{ type: "text", text: "Wiped all." }] }; }
      store = store.filter(e => !((tag && e.tag === tag) || (project && e.project === project)));
      await saveContextStore(store);
      return { content: [{ type: "text", text: "Cleared matching entries." }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
  }
}
