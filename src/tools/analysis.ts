import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { 
  ServerContext, 
  CorrelateErrorsArgs, 
  DependencyGraphArgs,
  SymbolIndex,
  PackageMapEntry,
  RepoInfo
} from "../types.js";
import { SYMBOL_INDEX_PATH } from "../config.js";
import { guardedCompletionPost } from "../helpers/rate-guard.js";
import { trackUsage } from "../helpers/pricing.js";
import fs from "fs/promises";
import path from "path";
import semver from "semver";

export function registerAnalysisTools(ctx: ServerContext) {
  const tools = [
    {
      name: "correlate_errors",
      description: "Analyze log snippets from multiple systems to find root causes and correlations",
      inputSchema: {
        type: "object",
        properties: {
          logs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                system_name: { type: "string" },
                content: { type: "string" }
              },
              required: ["system_name", "content"]
            }
          }
        },
        required: ["logs"]
      },
    },
    {
      name: "dependency_graph",
      description: "Analyze shared dependencies and semver conflicts across multiple projects",
      inputSchema: {
        type: "object",
        properties: {
          repos: { type: "array", items: { type: "string" }, description: "Optional list of project names to analyze" },
          check_conflicts: { type: "boolean", description: "Whether to run semver conflict detection" },
          include_dev: { type: "boolean", description: "Include devDependencies in the analysis" }
        }
      },
    }
  ];

  return {
    tools,
    handlers: {
      correlate_errors: handleCorrelateErrors,
      dependency_graph: handleDependencyGraph,
    }
  };

  async function handleCorrelateErrors(args: CorrelateErrorsArgs) {
    const { logs } = args;
    const formattedLogs = logs.map(l => `SYSTEM: ${l.system_name}\nLOGS:\n${l.content}\n---`).join("\n\n");
    const systemPrompt = `You are an expert Reliability Engineer. Find correlations and identify root causes in these logs.`;
    try {
      const response = await guardedCompletionPost(ctx, "anthropic/claude-3.5-sonnet", {
        model: "anthropic/claude-3.5-sonnet",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `Analyze logs:\n\n${formattedLogs}` }]
      });
      trackUsage(ctx, response.data.model, response.data.usage);
      return { content: [{ type: "text", text: response.data.choices[0].message.content }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
  }

  function parseCargoToml(content: string): { name?: string; version?: string; deps: Record<string, string> } {
    const deps: Record<string, string> = {};
    let section = "";
    let name, version;
    for (const line of content.split("\n")) {
      const l = line.trim();
      if (l.startsWith("[")) { section = l.match(/^\[([^\]]+)\]/)?.[1].trim() || ""; continue; }
      if (section === "package") {
        const nm = l.match(/^name\s*=\s*"([^"]+)"/); if (nm) name = nm[1];
        const vm = l.match(/^version\s*=\s*"([^"]+)"/); if (vm) version = vm[1];
      }
      if (section === "dependencies" || section === "dev-dependencies") {
        const str = l.match(/^([a-zA-Z0-9_-]-*)\s*=\s*"([^"]+)"/); if (str) deps[str[1]] = str[2];
        const tbl = l.match(/^([a-zA-Z0-9_-]-*)\s*=\s*\{[^}]*version\s*=\s*"([^"]+)"/); if (tbl) deps[tbl[1]] = tbl[2];
      }
    }
    return { name, version, deps };
  }

  async function handleDependencyGraph(args: DependencyGraphArgs) {
    const { repos: filterRepos, check_conflicts = true, include_dev = false } = args;
    try {
      const symbolIndex: SymbolIndex = JSON.parse(await fs.readFile(SYMBOL_INDEX_PATH, "utf-8"));
      const targets = filterRepos?.length ? Object.keys(symbolIndex).filter(n => filterRepos.includes(n)) : Object.keys(symbolIndex);
      const packageMap = new Map<string, PackageMapEntry[]>();
      const repoInfoMap: Record<string, RepoInfo> = {};
      for (const repoName of targets) {
        const repoPath = symbolIndex[repoName].path;
        try {
          const pkg = JSON.parse(await fs.readFile(path.join(repoPath, "package.json"), "utf-8"));
          const deps = { ...pkg.dependencies, ...(include_dev ? pkg.devDependencies : {}) };
          for (const [n, v] of Object.entries(deps)) {
            if (!packageMap.has(n)) packageMap.set(n, []);
            packageMap.get(n)!.push({ repo: repoName, version_range: String(v), manifest: "package.json" });
          }
          repoInfoMap[repoName] = { type: "npm", displayName: pkg.name || repoName, depCount: Object.keys(deps).length };
        } catch {
          try {
            const cargo = parseCargoToml(await fs.readFile(path.join(repoPath, "Cargo.toml"), "utf-8"));
            for (const [n, v] of Object.entries(cargo.deps)) {
              if (!packageMap.has(n)) packageMap.set(n, []);
              packageMap.get(n)!.push({ repo: repoName, version_range: semver.validRange(v) ? v : `^${v}`, manifest: "Cargo.toml" });
            }
            repoInfoMap[repoName] = { type: "cargo", displayName: cargo.name || repoName, depCount: Object.keys(cargo.deps).length };
          } catch {
            repoInfoMap[repoName] = { type: "unknown", displayName: repoName, stubbed: true };
          }
        }
      }
      const shared = [...packageMap.entries()].filter(([, e]) => e.length > 1);
      const conflicts: Array<{ pkg: string; a: PackageMapEntry; b: PackageMapEntry }> = [];
      if (check_conflicts) {
        for (const [pkg, entries] of shared) {
          for (let i = 0; i < entries.length; i++) {
            for (let j = i + 1; j < entries.length; j++) {
              if (semver.validRange(entries[i].version_range) && semver.validRange(entries[j].version_range) && !semver.intersects(entries[i].version_range, entries[j].version_range)) {
                conflicts.push({ pkg, a: entries[i], b: entries[j] });
              }
            }
          }
        }
      }

      // Restore detailed output
      const sections = [];
      
      // Section 1: Summary
      sections.push(`## 📊 Summary\nAnalyzed ${targets.length} repos. Found ${shared.length} shared packages and ${conflicts.length} conflicts.`);
      
      // Section 2: Repos
      const repoTable = Object.entries(repoInfoMap).map(([name, info]) => `| ${name} | ${info.type} | ${info.depCount || 0} |`).join("\n");
      sections.push(`## 📁 Repositories\n| Project | Type | Dependencies |\n|:---|:---|:---|\n${repoTable}`);
      
      // Section 3: Shared Packages
      if (shared.length > 0) {
        const sharedList = shared.map(([pkg, entries]) => `- **${pkg}**: Used in ${entries.map(e => `${e.repo} (${e.version_range})`).join(", ")}`).join("\n");
        sections.push(`## 🤝 Shared Packages\n${sharedList}`);
      }
      
      // Section 4: Conflicts
      if (conflicts.length > 0) {
        const conflictList = conflicts.map(c => `### ⚠️ ${c.pkg}\n- **${c.a.repo}**: \`${c.a.version_range}\`\n- **${c.b.repo}**: \`${c.b.version_range}\``).join("\n\n");
        sections.push(`## 🔴 Semver Conflicts\n${conflictList}`);
      } else if (check_conflicts) {
        sections.push(`## ✅ Conflicts\nNo semver conflicts detected across shared packages.`);
      }

      return { content: [{ type: "text", text: sections.join("\n\n") }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
  }
}
