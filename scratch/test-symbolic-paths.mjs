// SPDX-License-Identifier: MIT

import { resolveHomePath } from "../build/helpers/path-utils.js";
import os from "os";
import path from "path";
import assert from "assert";

console.log("=== Testing Symbolic Path Resolution ===");

// Set up mock env vars
process.env.MOCK_PROJECTS_DIR = "/home/tim/dev/projects";
process.env.MOCK_USER = "tim";

try {
  // Test 1: Standard tilde expansion
  const expandedHome = resolveHomePath("~/dev/projects");
  const expectedHome = path.join(os.homedir(), "dev/projects");
  console.log(`- Test 1 (Home tilde): "${expandedHome}"`);
  assert.strictEqual(expandedHome, expectedHome);
  console.log("✅ Test 1 Passed!");

  // Test 2: Unix Env Var expansion ($VAR)
  const expandedUnix = resolveHomePath("$MOCK_PROJECTS_DIR/openrouter-mcp");
  console.log(`- Test 2 (Unix Env Var): "${expandedUnix}"`);
  assert.strictEqual(expandedUnix, "/home/tim/dev/projects/openrouter-mcp");
  console.log("✅ Test 2 Passed!");

  // Test 3: Windows Env Var expansion (%VAR%)
  const expandedWin = resolveHomePath("%MOCK_PROJECTS_DIR%\\openrouter-mcp");
  console.log(`- Test 3 (Windows Env Var): "${expandedWin}"`);
  assert.strictEqual(expandedWin, "/home/tim/dev/projects\\openrouter-mcp");
  console.log("✅ Test 3 Passed!");

  // Test 4: Combined expansion ($HOME and ~)
  process.env.MY_DOCS = "documents";
  const combined = resolveHomePath("~/dev/$MY_DOCS");
  const expectedCombined = path.join(os.homedir(), "dev/documents");
  console.log(`- Test 4 (Combined ~ and $VAR): "${combined}"`);
  assert.strictEqual(combined, expectedCombined);
  console.log("✅ Test 4 Passed!");

  console.log("\n🎉 All Symbolic Path Resolution Tests Passed successfully!");
} catch (error) {
  console.error("❌ Test failed:", error);
  process.exit(1);
}
