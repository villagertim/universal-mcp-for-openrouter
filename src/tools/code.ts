// SPDX-License-Identifier: MIT

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { 
  ServerContext, 
  ContextEntry,
  IndexProjectArgs,
  SearchSymbolsArgs,
  ReindexProjectArgs,
  SemanticCodeSearchArgs,
  SymbolIndex,
  SymbolEntry
} from "../types.js";
import { SYMBOL_INDEX_PATH, CODE_TAG, CODE_EMBEDDING_MODEL, CODE_CHUNK_LINES, CODE_CHUNK_STRIDE, CODE_MAX_FILE_BYTES, CODE_DEFAULT_MAX_CHUNKS, CODE_SKIP_DIRS, CODE_SKIP_EXTS, CODE_SOURCE_EXTS } from "../config.js";
import { getEmbedding, cosineSimilarity } from "../helpers/embeddings.js";
import { loadContextStore, saveContextStore } from "../helpers/context-store.js";
import { validatePath, resolveHomePath } from "../helpers/path-utils.js";
import { watchProject } from "../helpers/watcher.js";
import fs from "fs/promises";
import path from "path";
import { createHash } from "crypto";

export function registerCodeTools(ctx: ServerContext) {
  const tools = [
    {
      name: "index_project",
      description: "Scan a project directory to index symbols (functions, classes, variables) for cross-project awareness",
      inputSchema: {
        type: "object",
        properties: {
          project_path: { type: "string", description: "Absolute path (or ~/ path) to the project directory to index" },
          project_name: { type: "string", description: "Name to identify this project" }
        },
        required: ["project_path", "project_name"]
      },
    },
    {
      name: "search_symbols",
      description: "Search for symbols across all indexed projects",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string", description: "Symbol name or partial name to search for" } },
        required: ["query"]
      },
    },
    {
      name: "reindex_project",
      description: "Perform deep semantic indexing of a project (code chunking + embeddings) for code search",
      inputSchema: {
        type: "object",
        properties: {
          project_name: { type: "string", description: "The name of the project to reindex" },
          max_chunks: { type: "number", description: "Maximum number of chunks to embed (default: 1000)" }
        },
        required: ["project_name"]
      },
    },
    {
      name: "semantic_code_search",
      description: "Search for code logic across indexed projects using natural language",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Natural language description of what you are looking for" },
          repos: { type: "array", items: { type: "string" }, description: "Restrict search to specific projects" },
          top_k: { type: "number", description: "Number of code snippets to return (default: 5)" },
          file_pattern: { type: "string", description: "Optional glob-like filter for filenames" }
        },
        required: ["query"]
      },
    }
  ];

  return {
    tools,
    handlers: {
      index_project: handleIndexProject,
      search_symbols: handleSearchSymbols,
      reindex_project: handleReindexProject,
      semantic_code_search: handleSemanticCodeSearch,
    }
  };

  async function handleIndexProject(args: IndexProjectArgs) {
    const { project_path, project_name } = args;
    const symbols: SymbolEntry[] = [];
    try {
      const resolvedPath = path.resolve(resolveHomePath(project_path));
      validatePath(resolvedPath);
      
      const walk = async (dir: string) => {
        const files = await fs.readdir(dir, { withFileTypes: true });
        for (const file of files) {
          const res = path.resolve(dir, file.name);
          if (file.isDirectory()) {
            if (CODE_SKIP_DIRS.has(file.name)) continue;
            await walk(res);
          } else {
            const ext = path.extname(file.name);
            if (CODE_SOURCE_EXTS.has(ext)) {
              const content = await fs.readFile(res, "utf-8");
              const functionRegex = /(?:function|class|const|let|var)\s+([a-zA-Z0-9_]+)\s*[:=({]/g;
              let match;
              while ((match = functionRegex.exec(content)) !== null) {
                symbols.push({ 
                  name: match[1], 
                  file: path.relative(resolvedPath, res), 
                  project: project_name, 
                  line: content.substring(0, match.index).split("\n").length 
                });
              }
            }
          }
        }
      };
      await walk(resolvedPath);
      let currentIndex: SymbolIndex = {};
      try { currentIndex = JSON.parse(await fs.readFile(SYMBOL_INDEX_PATH, "utf-8")); } catch (e) {}
      currentIndex[project_name] = { path: resolvedPath, symbols, lastIndexed: new Date().toISOString() };
      await fs.writeFile(SYMBOL_INDEX_PATH, JSON.stringify(currentIndex, null, 2));

      // Start background real-time watches dynamically
      watchProject(ctx, project_name, resolvedPath).catch(err => {
        console.error(`[Watcher] Dynamic watch binding failed for "${project_name}":`, err.message);
      });

      return { content: [{ type: "text", text: `Indexed ${symbols.length} symbols in "${project_name}".` }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
  }

  async function handleSearchSymbols(args: SearchSymbolsArgs) {
    const { query } = args;
    try {
      const index: SymbolIndex = JSON.parse(await fs.readFile(SYMBOL_INDEX_PATH, "utf-8"));
      const results: SymbolEntry[] = [];
      const lowerQuery = query.toLowerCase();
      for (const prjName in index) {
        for (const sym of index[prjName].symbols) {
          if (sym.name.toLowerCase().includes(lowerQuery)) results.push(sym);
        }
      }
      if (results.length === 0) return { content: [{ type: "text", text: `No symbols found for "${query}".` }] };
      
      const formatted = results.slice(0, 50).map(r => {
        const projectPath = index[r.project]?.path || "";
        const absoluteFile = (projectPath && !path.isAbsolute(r.file)) ? path.resolve(projectPath, r.file) : r.file;
        return `[${r.project}] ${r.name} -> ${path.relative(process.cwd(), absoluteFile)}:${r.line}`;
      }).join("\n");
      
      return { content: [{ type: "text", text: `Found ${results.length} symbols:\n\n${formatted}` }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
  }

  async function handleReindexProject(args: ReindexProjectArgs) {
    const { project_name, max_chunks = CODE_DEFAULT_MAX_CHUNKS } = args;
    try {
      const index: SymbolIndex = JSON.parse(await fs.readFile(SYMBOL_INDEX_PATH, "utf-8"));
      if (!index[project_name]) throw new Error(`Project "${project_name}" not found.`);
      const projectPath = index[project_name].path;
      const store = await loadContextStore();
      const previousProjectEntries = store.filter(e => e.tag === CODE_TAG && e.project === project_name);
      
      let added = 0, unchanged = 0;
      const newEntries: ContextEntry[] = [];
      const walk = async (dir: string) => {
        const files = await fs.readdir(dir, { withFileTypes: true });
        for (const f of files) {
          const res = path.resolve(dir, f.name);
          if (f.isDirectory()) { if (!CODE_SKIP_DIRS.has(f.name)) await walk(res); }
          else if (CODE_SOURCE_EXTS.has(path.extname(f.name))) {
            const relativeFile = path.relative(projectPath, res);
            const fileEntries = previousProjectEntries.filter(e => e.file === relativeFile);
            const content = await fs.readFile(res, "utf-8");
            const lines = content.split("\n");

            // 1. Identify all previous chunks that can be reused because their text is exactly present in the content.
            const reusedEntries: ContextEntry[] = [];
            const coveredLines = new Set<number>(); // 1-indexed line numbers

            for (const entry of fileEntries) {
              if (!entry.text || entry.text.length < 30) continue;
              const idx = content.indexOf(entry.text);
              if (idx !== -1) {
                const startLine = content.substring(0, idx).split("\n").length;
                const linesInChunk = entry.text.split("\n").length;
                const endLine = startLine + linesInChunk - 1;

                reusedEntries.push({
                  ...entry,
                  start_line: startLine,
                  end_line: endLine,
                  timestamp: new Date().toISOString()
                });
                unchanged++;

                for (let l = startLine; l <= endLine; l++) {
                  coveredLines.add(l);
                }
              }
            }

            const reusedHashes = new Set(reusedEntries.map(e => e.hash));
            newEntries.push(...reusedEntries);

            // 2. Perform the standard stride-based chunking loop to find any new or modified sections.
            for (let s = 0; s < lines.length; s += CODE_CHUNK_STRIDE) {
              if (added + unchanged >= max_chunks) break;
              const text = lines.slice(s, s + CODE_CHUNK_LINES).join("\n").trim();
              if (text.length < 30) continue;
              const hash = createHash("md5").update(text).digest("hex");

              // If this chunk's hash is already in our reused entries, skip it
              if (reusedHashes.has(hash)) {
                continue;
              }

              // Check if covered
              let uncoveredLines = 0;
              const chunkStart = s + 1;
              const chunkEnd = Math.min(s + CODE_CHUNK_LINES, lines.length);
              for (let l = chunkStart; l <= chunkEnd; l++) {
                if (!coveredLines.has(l)) {
                  uncoveredLines++;
                }
              }

              if (uncoveredLines === 0) {
                continue;
              }

              const embedding = await getEmbedding(ctx, text, CODE_EMBEDDING_MODEL);
              newEntries.push({
                id: `code_${Date.now()}_${Math.random()}`,
                text,
                tag: CODE_TAG,
                embedding,
                timestamp: new Date().toISOString(),
                project: project_name,
                file: relativeFile,
                start_line: chunkStart,
                end_line: chunkEnd,
                hash
              });
              added++;

              for (let l = chunkStart; l <= chunkEnd; l++) {
                coveredLines.add(l);
              }
            }
          }
        }
      };
      await walk(projectPath);
      await saveContextStore([...store.filter(e => !(e.tag === CODE_TAG && e.project === project_name)), ...newEntries]);
      return { content: [{ type: "text", text: `Indexed "${project_name}": ${added} new, ${unchanged} unchanged.` }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
  }

  async function handleSemanticCodeSearch(args: SemanticCodeSearchArgs) {
    const { query, repos, top_k = 5, file_pattern } = args;
    try {
      let entries = (await loadContextStore()).filter(e => e.tag === CODE_TAG);
      if (repos) entries = entries.filter(e => repos.includes(e.project ?? ""));
      if (file_pattern) entries = entries.filter(e => e.file?.toLowerCase().includes(file_pattern.toLowerCase()));
      if (entries.length === 0) return { content: [{ type: "text", text: "No matches." }] };
      const qEmb = await getEmbedding(ctx, query, CODE_EMBEDDING_MODEL);
      const scored = entries.map(e => ({ ...e, score: cosineSimilarity(qEmb, e.embedding) })).sort((a, b) => b.score - a.score).slice(0, top_k);
      
      const symbolIndex: SymbolIndex = JSON.parse(await fs.readFile(SYMBOL_INDEX_PATH, "utf-8"));
      
      const results = scored.map((e, i) => {
        const projectPath = symbolIndex[e.project!]?.path || "";
        const absoluteFile = (projectPath && !path.isAbsolute(e.file!)) ? path.resolve(projectPath, e.file!) : e.file!;
        return `### #${i + 1} (${e.score.toFixed(4)}) [${e.project}] ${path.relative(process.cwd(), absoluteFile)}\n\`\`\`\n${e.text}\n\`\`\``;
      }).join("\n\n");
      return { content: [{ type: "text", text: results }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
  }
}
