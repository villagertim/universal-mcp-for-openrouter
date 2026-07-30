// SPDX-License-Identifier: MIT

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ServerContext } from "../types.js";
import { RATE_CONFIG_PATH, SYMBOL_INDEX_PATH, CONTEXT_STORE_PATH } from "../config.js";
import fs from "fs/promises";
import path from "path";
import semver from "semver";

export function registerVerifyTools(ctx: ServerContext) {
  const tools = [
    {
      name: "verify_setup",
      title: "Verify Server Setup",
      description: "Perform diagnostic checks on OpenRouter credentials, files, and server environment",
      annotations: { readOnlyHint: true, idempotentHint: true },
      inputSchema: { type: "object", properties: {} },
    }
  ];

  return {
    tools,
    handlers: {
      verify_setup: handleVerifySetup,
    }
  };

  async function handleVerifySetup() {
    const report: string[] = ["## 🔍 OpenRouter MCP Verification Report"];

    // 1. Node.js Version Check
    const nodeVersion = process.version;
    const cleanNodeVersion = semver.coerce(nodeVersion)?.version || "0.0.0";
    const isNodeCompatible = semver.gte(cleanNodeVersion, "20.12.0");
    if (isNodeCompatible) {
      report.push(`- **Node.js:** ✅ Passed (Version: \`${nodeVersion}\` >= \`20.12.0\`)`);
    } else {
      report.push(`- **Node.js:** ⚠️ Warning (Version: \`${nodeVersion}\` < \`20.12.0\`). Tests will crash due to missing \`node:util\` styleText export. Please upgrade.`);
    }

    // 2. OpenRouter API Key Check
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (apiKey) {
      const isFormatOk = apiKey.startsWith("sk-or-");
      if (isFormatOk) {
        report.push(`- **API Key:** ✅ Configured (\`sk-or-...\` format verified)`);
      } else {
        report.push(`- **API Key:** 🟡 Present but custom format (Length: ${apiKey.length} chars)`);
      }
    } else {
      report.push(`- **API Key:** ❌ Missing (OPENROUTER_API_KEY environment variable is empty)`);
    }

    // 3. File Permissions Check
    const checkWrite = async (filePath: string) => {
      try {
        await fs.access(filePath, fs.constants.R_OK | fs.constants.W_OK);
        return `✅ Writable`;
      } catch (err: any) {
        if (err.code === "ENOENT") {
          try {
            const dir = path.dirname(filePath);
            await fs.mkdir(dir, { recursive: true });
            const testPath = `${filePath}.test`;
            await fs.writeFile(testPath, "test");
            await fs.unlink(testPath);
            return `✅ Accessible (Not yet created)`;
          } catch {
            return `❌ Dir not writable`;
          }
        }
        return `❌ Permission denied`;
      }
    };

    const rateConfigStatus = await checkWrite(RATE_CONFIG_PATH);
    const symbolIndexStatus = await checkWrite(SYMBOL_INDEX_PATH);
    const contextStoreStatus = await checkWrite(CONTEXT_STORE_PATH);

    report.push(`- **File Permissions:**`);
    report.push(`  - \`rate_config.json\`: ${rateConfigStatus}`);
    report.push(`  - \`symbol_index.json\`: ${symbolIndexStatus}`);
    report.push(`  - \`context_store.json\`: ${contextStoreStatus}`);

    // 4. Session Statistics
    const cacheCount = Object.keys(ctx.pricingCache).length;
    report.push(`- **Pricing Cache:** ${cacheCount > 0 ? `✅ Active (${cacheCount} models cached)` : "🟡 Pending cache sync"}`);
    report.push(`- **Session Spend:** $${ctx.sessionUsage.cost.toFixed(6)} / $${ctx.rateLimiterConfig.max_dollars.toFixed(2)} limit`);

    return { content: [{ type: "text", text: report.join("\n") }] };
  }
}
