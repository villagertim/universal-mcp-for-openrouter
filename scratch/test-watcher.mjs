// SPDX-License-Identifier: MIT

import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import assert from "assert";
import { fileURLToPath } from "url";
import { watchProject, closeAllWatchers } from "../build/helpers/watcher.js";
import { SYMBOL_INDEX_PATH, CONTEXT_STORE_PATH, CODE_EMBEDDING_MODEL } from "../build/config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");

// Backup paths
const symbolIndexFile = path.join(projectRoot, "symbol_index.json");
const contextStoreFile = path.join(projectRoot, "context_store.json");
const symbolIndexBak = path.join(projectRoot, "symbol_index.json.bak");
const contextStoreBak = path.join(projectRoot, "context_store.json.bak");

// Temporary test sandbox
const testSandbox = path.join(projectRoot, "scratch", "test-project-sandbox");

console.log("=== Starting Real-Time Incremental Watcher Integration Tests ===");

// 1. Back up production databases
let backedUpSymbols = false;
let backedUpContext = false;

if (fsSync.existsSync(symbolIndexFile)) {
  fsSync.renameSync(symbolIndexFile, symbolIndexBak);
  backedUpSymbols = true;
}
if (fsSync.existsSync(contextStoreFile)) {
  fsSync.renameSync(contextStoreFile, contextStoreBak);
  backedUpContext = true;
}

// Ensure sandbox is clean
if (fsSync.existsSync(testSandbox)) {
  fsSync.rmSync(testSandbox, { recursive: true, force: true });
}
fsSync.mkdirSync(testSandbox, { recursive: true });

// Setup empty clean database files
fsSync.writeFileSync(symbolIndexFile, JSON.stringify({}, null, 2));
fsSync.writeFileSync(contextStoreFile, JSON.stringify([], null, 2));

// 2. Setup Mock Server Context with Embedding Call Spy
let embeddingCallCount = 0;
const requestedTexts = [];

const mockCtx = {
  axiosInstance: {
    post: async (url, data) => {
      if (url === "/embeddings") {
        embeddingCallCount++;
        requestedTexts.push(data.input);
        return {
          data: {
            data: [{ embedding: Array(384).fill(0.123) }],
            model: CODE_EMBEDDING_MODEL,
            usage: { prompt_tokens: 10, total_tokens: 10 }
          }
        };
      }
      throw new Error(`Unexpected POST request to ${url}`);
    }
  },
  rateLimiterConfig: {
    max_dollars: 10.0,
    warn_at_percent: 80,
    max_requests_per_minute: 100,
    disable_failover: false,
    fallback_price_multiplier: 1.5
  },
  sessionUsage: { prompt_tokens: 0, completion_tokens: 0, cost: 0.0 },
  circuitBreakerMap: new Map(),
  tokenBucketMap: new Map(),
  pricingCache: {
    [CODE_EMBEDDING_MODEL]: { prompt: "0.0000001", completion: "0.0000001" }
  }
};

// 3. Helper to Wait
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
  try {
    // ----------------------------------------------------
    // TEST CASE 1: Dynamic recursive watcher registration & AST parsing
    // ----------------------------------------------------
    console.log("\n1. Testing recursive watch initiation & initial indexing...");
    
    // Create nested directory structure
    const srcDir = path.join(testSandbox, "src");
    const componentsDir = path.join(srcDir, "components");
    fsSync.mkdirSync(componentsDir, { recursive: true });

    // Seed mock project inside symbol_index.json
    const initialIndex = {
      "sandbox-proj": {
        path: testSandbox,
        symbols: [],
        lastIndexed: new Date().toISOString()
      }
    };
    fsSync.writeFileSync(symbolIndexFile, JSON.stringify(initialIndex, null, 2));

    // Start watching the project
    await watchProject(mockCtx, "sandbox-proj", testSandbox);

    // Create a new source file inside components directory
    const componentFile = path.join(componentsDir, "button.ts");
    const seedContent = `// Button component
class ButtonWidget {
  render() {
    console.log("Rendering button");
  }
}
function calculateSum(a: number, b: number) {
  return a + b;
}
`;
    fsSync.writeFileSync(componentFile, seedContent);
    console.log(`Created button.ts. Waiting 2.5 seconds for debounced watcher...`);
    await delay(2500);

    // Assert AST symbols were parsed incrementally
    const parsedIndex = JSON.parse(fsSync.readFileSync(symbolIndexFile, "utf-8"));
    const symbols = parsedIndex["sandbox-proj"].symbols;
    console.log("Parsed AST symbols:", symbols);
    assert.strictEqual(symbols.length, 2, "Should parse class and function symbols");
    assert.ok(symbols.some(s => s.name === "ButtonWidget"), "Should capture ButtonWidget class");
    assert.ok(symbols.some(s => s.name === "calculateSum"), "Should capture calculateSum function");

    // Assert semantic embedding was calculated
    const parsedStore = JSON.parse(fsSync.readFileSync(contextStoreFile, "utf-8"));
    console.log("Semantic entries count:", parsedStore.length);
    assert.strictEqual(parsedStore.length, 1, "Should create exactly 1 embedding entry for button.ts");
    assert.strictEqual(embeddingCallCount, 1, "Should trigger exactly 1 OpenRouter Embedding API call");
    console.log("✅ Watcher dynamic binding & initial AST/Embedding generation passed!");

    // ----------------------------------------------------
    // TEST CASE 2: Two-Stage Line-Shift Resilient MD5 Reuse Guard
    // ----------------------------------------------------
    console.log("\n2. Testing line-shift resilient MD5 embedding reuse...");

    // Create a file > 50 lines to create multiple overlapping chunks
    const chunkFile = path.join(srcDir, "calculator.ts");
    let calculatorContent = "";
    // Write 45 comment lines
    for (let i = 1; i <= 45; i++) {
      calculatorContent += `// Comment line number ${i} in calculator\n`;
    }
    // Add stable symbols and code chunks
    calculatorContent += `
function runMath(a: number, b: number) {
  return a * b;
}
class AdvancedMath {
  calculateFactorial(n: number) {
    if (n <= 1) return 1;
    return n * this.calculateFactorial(n - 1);
  }
}
`;
    fsSync.writeFileSync(chunkFile, calculatorContent);
    console.log(`Created calculator.ts (> 50 lines). Waiting 2.5 seconds for re-indexing...`);
    await delay(2500);

    // Get current embedding count and items in context store
    const storeAfterCalc = JSON.parse(fsSync.readFileSync(contextStoreFile, "utf-8"));
    const calcEntries = storeAfterCalc.filter(e => e.file === "src/calculator.ts");
    console.log(`calculator.ts generated ${calcEntries.length} overlapping chunks.`);
    assert.ok(calcEntries.length >= 2, "Should create multiple chunks for a file > 50 lines");

    const previousEmbeddingCalls = embeddingCallCount;

    // NOW: Trigger a line-shift modification. Prepend 5 comment lines at the VERY TOP.
    let shiftedContent = `// Pre-flight Shift Comment A\n// Pre-flight Shift Comment B\n// Pre-flight Shift Comment C\n` + calculatorContent;
    fsSync.writeFileSync(chunkFile, shiftedContent);
    console.log(`Prepended shift comments (inserted lines at top). Waiting 2.5 seconds for line-shifted debounced watching...`);
    await delay(2500);

    // Verify context store updates
    const storeAfterShift = JSON.parse(fsSync.readFileSync(contextStoreFile, "utf-8"));
    const calcEntriesAfter = storeAfterShift.filter(e => e.file === "src/calculator.ts");

    // Trace embedding calls
    const newEmbeddingCalls = embeddingCallCount - previousEmbeddingCalls;
    console.log(`Total embedding API calls during shift: ${newEmbeddingCalls}`);
    console.log("Calculated chunk indices and line offsets after shift:");
    for (const ent of calcEntriesAfter) {
      console.log(`  Chunk: "${ent.text.slice(0, 40).replace(/\n/g, " ")}..." Lines: ${ent.start_line} to ${ent.end_line}`);
    }

    // Since the bottom chunk was 100% identical but simply shifted down, the MD5 Hash Guard should have REUSED it!
    // Total API calls must be LESS than total chunks, proving successful vector reuse!
    assert.ok(newEmbeddingCalls < calcEntriesAfter.length, "MD5 Reuse Guard should bypass API calls for identical shifted chunks!");
    assert.ok(newEmbeddingCalls > 0, "At least one modified chunk (the top one containing new comments) should request a new embedding");
    console.log("✅ Line-shift resilient MD5 reuse guard passed!");

    // ----------------------------------------------------
    // TEST CASE 3: Dynamic registration of subdirectories
    // ----------------------------------------------------
    console.log("\n3. Testing dynamic watch binding on newly created subdirectories...");

    const dynamicSubdir = path.join(srcDir, "dynamic-components");
    fsSync.mkdirSync(dynamicSubdir, { recursive: true });
    await delay(500); // Allow watcher to bind to rename event

    const dynamicFile = path.join(dynamicSubdir, "toggle.ts");
    const dynamicCode = `// Dynamic component
function toggleActive() {
  return true;
}
`;
    fsSync.writeFileSync(dynamicFile, dynamicCode);
    console.log(`Created dynamic-components/toggle.ts inside new subfolder. Waiting 2.5 seconds...`);
    await delay(2500);

    const finalParsedIndex = JSON.parse(fsSync.readFileSync(symbolIndexFile, "utf-8"));
    const finalSymbols = finalParsedIndex["sandbox-proj"].symbols;
    assert.ok(finalSymbols.some(s => s.name === "toggleActive"), "Should register AST symbols inside dynamically created directory watchers");
    console.log("✅ Dynamic watcher binding on subfolders passed!");

    // ----------------------------------------------------
    // TEST CASE 4: File Deletion Event
    // ----------------------------------------------------
    console.log("\n4. Testing file deletion cleanups...");

    fsSync.unlinkSync(componentFile);
    console.log("Deleted button.ts. Waiting 2.5 seconds for debounced watcher...");
    await delay(2500);

    // Verify symbols and context store entries are wiped clean
    const postDeleteIndex = JSON.parse(fsSync.readFileSync(symbolIndexFile, "utf-8"));
    const postDeleteSymbols = postDeleteIndex["sandbox-proj"].symbols;
    assert.ok(!postDeleteSymbols.some(s => s.file === "src/components/button.ts"), "AST symbols for deleted file must be wiped");

    const postDeleteStore = JSON.parse(fsSync.readFileSync(contextStoreFile, "utf-8"));
    assert.ok(!postDeleteStore.some(e => e.file === "src/components/button.ts"), "Semantic entries for deleted file must be wiped");
    console.log("✅ File deletion cleanup passed!");

  } catch (err) {
    console.error("❌ Test assertion failed:", err);
    process.exit(1);
  } finally {
    // Graceful cleanups
    closeAllWatchers();

    // Clean sandbox
    if (fsSync.existsSync(testSandbox)) {
      fsSync.rmSync(testSandbox, { recursive: true, force: true });
    }

    // Restore original production files
    if (fsSync.existsSync(symbolIndexFile)) fsSync.unlinkSync(symbolIndexFile);
    if (fsSync.existsSync(contextStoreFile)) fsSync.unlinkSync(contextStoreFile);

    if (backedUpSymbols) fsSync.renameSync(symbolIndexBak, symbolIndexFile);
    if (backedUpContext) fsSync.renameSync(contextStoreBak, contextStoreFile);

    console.log("\n✨ ALL REAL-TIME INCREMENTAL WATCHER TESTS COMPLETED SUCCESSFULLY! ✨");
  }
}

runTests();
