// SPDX-License-Identifier: MIT

import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { createHash } from "crypto";
import { ServerContext, SymbolIndex, SymbolEntry, ContextEntry } from "../types.js";
import { 
  SYMBOL_INDEX_PATH, 
  CODE_TAG, 
  CODE_EMBEDDING_MODEL, 
  CODE_CHUNK_LINES, 
  CODE_CHUNK_STRIDE, 
  CODE_SKIP_DIRS, 
  CODE_SOURCE_EXTS 
} from "../config.js";
import { getEmbedding } from "./embeddings.js";
import { loadContextStore, saveContextStore } from "./context-store.js";

// Global Watcher Tracking State
const activeWatchers = new Map<string, fsSync.FSWatcher[]>();
const watchedDirsSet = new Map<string, Set<string>>(); // projectName -> Set of realpath absolute paths
const debounceTimers = new Map<string, NodeJS.Timeout>();

const MAX_WATCH_SUBDIRS = 500;
let symbolIndexWriteQueue = Promise.resolve();

/**
 * Initializes watchers for all pre-existing indexed projects on server startup.
 */
export async function initializeWatcher(ctx: ServerContext) {
  try {
    if (!fsSync.existsSync(SYMBOL_INDEX_PATH)) {
      return;
    }
    const index: SymbolIndex = JSON.parse(await fs.readFile(SYMBOL_INDEX_PATH, "utf-8"));
    console.error("[Watcher] 🔍 Scanning registered projects for active watching...");
    for (const projectName in index) {
      const projectEntry = index[projectName];
      if (!projectEntry) continue;
      const projectPath = projectEntry.path;
      if (fsSync.existsSync(projectPath)) {
        watchProject(ctx, projectName, projectPath).catch(err => {
          console.error(`[Watcher] Failed to initiate watch on "${projectName}":`, err.message);
        });
      }
    }
  } catch (err: any) {
    console.error("[Watcher] ⚠️ Failed to initialize background watchers:", err.message);
  }
}

/**
 * Traverses a project directory recursively and binds filesystem watchers with loop and limit guards.
 */
export async function watchProject(ctx: ServerContext, projectName: string, projectPath: string) {
  // Clean up any stale watchers first
  closeProjectWatchers(projectName);

  const watchers: fsSync.FSWatcher[] = [];
  const visited = new Set<string>();
  const watchedDirs = new Set<string>();
  let watchCount = 0;

  const traverseAndWatch = async (dir: string) => {
    try {
      const realDir = fsSync.realpathSync(dir);
      if (visited.has(realDir)) return;
      visited.add(realDir);

      const dirName = path.basename(dir);
      if (CODE_SKIP_DIRS.has(dirName) || CODE_SKIP_DIRS.has(path.basename(realDir))) return;

      // System resource guard (protect FDs and inotify ceilings)
      if (watchCount >= MAX_WATCH_SUBDIRS) {
        console.error(`[Watcher] ⚠️ Limit Exceeded: "${projectName}" has > ${MAX_WATCH_SUBDIRS} subdirectories. Safety ceiling applied.`);
        return;
      }

      // Bind filesystem watcher
      const watcher = fsSync.watch(dir, (eventType, filename) => {
        handleFileEvent(ctx, projectName, projectPath, dir, eventType, filename);
      });
      watcher.on("error", (err) => {
        console.error(`[Watcher] ⚠️ Watcher error inside ${dir}:`, err.message);
      });

      watchers.push(watcher);
      watchedDirs.add(realDir);
      watchCount++;

      const files = await fs.readdir(dir, { withFileTypes: true });
      for (const file of files) {
        if (file.isDirectory()) {
          if (CODE_SKIP_DIRS.has(file.name)) continue;
          await traverseAndWatch(path.join(dir, file.name));
        }
      }
    } catch (err: any) {
      console.error(`[Watcher] ⚠️ Failed to crawl or watch path "${dir}":`, err.message);
    }
  };

  await traverseAndWatch(projectPath);
  activeWatchers.set(projectName, watchers);
  watchedDirsSet.set(projectName, watchedDirs);
  console.error(`[Watcher] 🚀 Watch active for project "${projectName}" (${watchCount} folders watched).`);
}

/**
 * Handles incoming filesystem events from watch triggers with dynamic folder expansion.
 */
function handleFileEvent(
  ctx: ServerContext,
  projectName: string,
  projectPath: string,
  dirPath: string,
  eventType: string,
  filename: string | null
) {
  if (!filename) return;

  const fullPath = path.join(dirPath, filename);
  const ext = path.extname(filename);

  let isDirectory = false;
  try {
    if (fsSync.existsSync(fullPath)) {
      isDirectory = fsSync.statSync(fullPath).isDirectory();
    }
  } catch (e) {}

  if (isDirectory) {
    if (eventType === "rename" && !CODE_SKIP_DIRS.has(filename)) {
      // Dynamic dynamic watcher binding for newly created folders
      setTimeout(async () => {
        try {
          if (fsSync.existsSync(fullPath)) {
            await watchNewSubdirectory(ctx, projectName, projectPath, fullPath);
          }
        } catch (e) {}
      }, 200);
    }
    return;
  }

  // Reject non-source files
  if (!CODE_SOURCE_EXTS.has(ext)) return;

  // Keystroke Debouncing: Reset active timer
  if (debounceTimers.has(fullPath)) {
    clearTimeout(debounceTimers.get(fullPath)!);
  }

  const timer = setTimeout(async () => {
    debounceTimers.delete(fullPath);
    try {
      await processFileChange(ctx, projectName, projectPath, fullPath);
    } catch (err: any) {
      console.error(`[Watcher] ⚠️ Failed to process change on ${fullPath}:`, err.message);
    }
  }, 2000);

  debounceTimers.set(fullPath, timer);
}

/**
 * Dynamic registration for new folders.
 */
async function watchNewSubdirectory(ctx: ServerContext, projectName: string, projectPath: string, newDir: string) {
  const watchers = activeWatchers.get(projectName) || [];
  const watchedDirs = watchedDirsSet.get(projectName) || new Set<string>();

  const traverseAndWatch = async (dir: string) => {
    try {
      const realDir = fsSync.realpathSync(dir);
      if (watchedDirs.has(realDir)) return;

      if (watchers.length >= MAX_WATCH_SUBDIRS) {
        console.error(`[Watcher] ⚠️ safety ceiling reached (${MAX_WATCH_SUBDIRS}). Skipping dynamic watch on: ${dir}`);
        return;
      }

      const watcher = fsSync.watch(dir, (eventType, filename) => {
        handleFileEvent(ctx, projectName, projectPath, dir, eventType, filename);
      });
      watcher.on("error", (err) => {
        console.error(`[Watcher] ⚠️ Dynamically registered watcher error in ${dir}:`, err.message);
      });

      watchers.push(watcher);
      watchedDirs.add(realDir);

      const files = await fs.readdir(dir, { withFileTypes: true });
      for (const file of files) {
        if (file.isDirectory()) {
          if (CODE_SKIP_DIRS.has(file.name)) continue;
          await traverseAndWatch(path.join(dir, file.name));
        }
      }
    } catch (e) {}
  };

  await traverseAndWatch(newDir);
  activeWatchers.set(projectName, watchers);
  watchedDirsSet.set(projectName, watchedDirs);
}

/**
 * Triggers AST and Semantic incremental pipeline runs.
 */
async function processFileChange(ctx: ServerContext, projectName: string, projectPath: string, filePath: string) {
  const relativeFile = path.relative(projectPath, filePath);
  console.error(`[Watcher] 🔄 Incremental re-indexing: ${relativeFile}`);

  const exists = fsSync.existsSync(filePath);

  // 1. Update AST symbols
  await updateASTIndex(projectName, projectPath, relativeFile, filePath, exists);

  // 2. Update semantic search embeddings
  await updateSemanticIndex(ctx, projectName, projectPath, relativeFile, filePath, exists);
}

/**
 * Re-parses AST symbols for the modified file and updates symbol_index.json thread-safely.
 */
async function updateASTIndex(
  projectName: string,
  projectPath: string,
  relativeFile: string,
  filePath: string,
  exists: boolean
) {
  symbolIndexWriteQueue = symbolIndexWriteQueue.then(async () => {
    let currentIndex: SymbolIndex = {};
    try {
      currentIndex = JSON.parse(await fs.readFile(SYMBOL_INDEX_PATH, "utf-8"));
    } catch (e) {}

    const projectData = currentIndex[projectName];
    if (!projectData) return;

    // Filter out old symbols
    let newSymbols = projectData.symbols.filter(sym => sym.file !== relativeFile);

    if (exists) {
      try {
        const content = await fs.readFile(filePath, "utf-8");
        const functionRegex = /(?:function|class|const|let|var)\s+([a-zA-Z0-9_]+)\s*[:=({]/g;
        let match;
        while ((match = functionRegex.exec(content)) !== null) {
          newSymbols.push({
            name: match[1] ?? "",
            file: relativeFile,
            project: projectName,
            line: content.substring(0, match.index).split("\n").length
          });
        }
      } catch (err: any) {
        console.error(`[Watcher] AST parsing failed for ${relativeFile}:`, err.message);
      }
    }

    projectData.symbols = newSymbols;
    projectData.lastIndexed = new Date().toISOString();
    currentIndex[projectName] = projectData;

    await fs.writeFile(SYMBOL_INDEX_PATH, JSON.stringify(currentIndex, null, 2));
  }).catch(err => {
    console.error("[Watcher] ⚠️ Symbol AST index update queue failed:", err);
  });

  return symbolIndexWriteQueue;
}

/**
 * Incremental semantic re-indexing using our Two-Stage Line-Shift Resilient MD5 Reuse Guard.
 */
async function updateSemanticIndex(
  ctx: ServerContext,
  projectName: string,
  projectPath: string,
  relativeFile: string,
  filePath: string,
  exists: boolean
) {
  try {
    const store = await loadContextStore();

    const otherEntries = store.filter(e => !(e.tag === CODE_TAG && e.project === projectName && e.file === relativeFile));
    const previousFileEntries = store.filter(e => e.tag === CODE_TAG && e.project === projectName && e.file === relativeFile);

    const newFileEntries: ContextEntry[] = [];

    if (exists) {
      const content = await fs.readFile(filePath, "utf-8");
      const lines = content.split("\n");

      // 1. Identify all previous chunks that can be reused because their text is exactly present in the new content.
      const reusedEntries: ContextEntry[] = [];
      const coveredLines = new Set<number>(); // 1-indexed line numbers

      for (const entry of previousFileEntries) {
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

          for (let l = startLine; l <= endLine; l++) {
            coveredLines.add(l);
          }
        }
      }

      // 2. Perform the standard stride-based chunking loop to find any new or modified sections.
      let reusedCount = reusedEntries.length;
      let newCount = 0;

      const reusedHashes = new Set(reusedEntries.map(e => e.hash));
      newFileEntries.push(...reusedEntries);

      for (let s = 0; s < lines.length; s += CODE_CHUNK_STRIDE) {
        const text = lines.slice(s, s + CODE_CHUNK_LINES).join("\n").trim();
        if (text.length < 30) continue;

        const hash = createHash("md5").update(text).digest("hex");

        // If this chunk's hash is already in our reused entries, skip it
        if (reusedHashes.has(hash)) {
          continue;
        }

        // Check if this chunk is already fully covered by our reused entries
        let uncoveredLinesInChunk = 0;
        const chunkStart = s + 1;
        const chunkEnd = Math.min(s + CODE_CHUNK_LINES, lines.length);
        for (let l = chunkStart; l <= chunkEnd; l++) {
          if (!coveredLines.has(l)) {
            uncoveredLinesInChunk++;
          }
        }

        // If the chunk is fully/mostly covered (meaning all lines are represented in reused entries), skip it
        if (uncoveredLinesInChunk === 0) {
          continue;
        }

        // Otherwise, it is a new or significantly modified chunk! We need a new embedding.
        const embedding = await getEmbedding(ctx, text, CODE_EMBEDDING_MODEL);
        newFileEntries.push({
          id: `code_${Date.now()}_${Math.random()}`,
          text,
          tag: CODE_TAG,
          embedding,
          timestamp: new Date().toISOString(),
          project: projectName,
          file: relativeFile,
          start_line: chunkStart,
          end_line: chunkEnd,
          hash
        });
        newCount++;

        // Mark these lines as covered
        for (let l = chunkStart; l <= chunkEnd; l++) {
          coveredLines.add(l);
        }
      }

      console.error(`[Watcher] 💾 Saved incremental embeddings for ${relativeFile}. (Reused: ${reusedCount}, Calculated: ${newCount})`);
    } else {
      console.error(`[Watcher] 🗑️ File deleted. Cleaned all context store entries for ${relativeFile}.`);
    }

    await saveContextStore([...otherEntries, ...newFileEntries]);
  } catch (err: any) {
    console.error(`[Watcher] ⚠️ Semantic indexing failed for ${relativeFile}:`, err.message);
  }
}


/**
 * Closes all watchers for a specific project.
 */
export function closeProjectWatchers(projectName: string) {
  const watchers = activeWatchers.get(projectName);
  if (watchers) {
    for (const w of watchers) {
      try { w.close(); } catch (e) {}
    }
    activeWatchers.delete(projectName);
  }
  watchedDirsSet.delete(projectName);
}

/**
 * Gracefully closes all background watcher instances on server shutdown.
 */
export function closeAllWatchers() {
  console.error("[Watcher] 🛑 Releasing all filesystem watchers...");
  for (const [projectName, watchers] of activeWatchers.entries()) {
    for (const w of watchers) {
      try { w.close(); } catch (e) {}
    }
  }
  activeWatchers.clear();
  watchedDirsSet.clear();
}
