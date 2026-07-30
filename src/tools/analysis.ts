// SPDX-License-Identifier: MIT

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

export function parseYarnLockfile(content: string): Map<string, { version: string; paths: string[][] }> {
  const resolved = new Map<string, { version: string; paths: string[][] }>();
  const blocks = content.split("\n\n");
  for (const block of blocks) {
    const headerMatch = block.match(/^"?([@a-zA-Z0-9_.-]+(?:\/[@a-zA-Z0-9_.-]+)?|[a-zA-Z0-9_.-]+)@/m);
    const versionMatch = block.match(/version\s+"([^"]+)"/);
    if (headerMatch && versionMatch) {
      const name = headerMatch[1];
      const version = versionMatch[1];
      if (name && version && !resolved.has(name)) {
        resolved.set(name, { version, paths: [[name]] });
      }
    }
  }
  return resolved;
}

export function parsePnpmLockfile(content: string): Map<string, { version: string; paths: string[][] }> {
  const resolved = new Map<string, { version: string; paths: string[][] }>();
  const lines = content.split("\n");
  let inPackages = false;
  for (const line of lines) {
    if (line.startsWith("packages:")) {
      inPackages = true;
      continue;
    }
    if (inPackages && line && !line.startsWith(" ") && !line.startsWith("  ")) {
      if (!line.startsWith("importers:") && !line.startsWith("snapshots:")) {
        inPackages = false;
      }
    }
    if (inPackages) {
      const match = line.match(/^\s{2}['"]?\/?([@a-zA-Z0-9_.-]+(?:\/[@a-zA-Z0-9_.-]+)?)[@/]([0-9]+\.[0-9]+\.[0-9]+[^:'"]*)['"]?:/);
      if (match) {
        const name = match[1];
        const version = match[2];
        if (name && version && !resolved.has(name)) {
          resolved.set(name, { version, paths: [[name]] });
        }
      }
    }
  }
  return resolved;
}

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
          include_dev: { type: "boolean", description: "Include devDependencies in the analysis" },
          transitive: { type: "boolean", description: "Enable deep transitive dependency parsing of lockfiles" },
          focus_package: { type: "string", description: "Trace all deep dependency paths leading to this specific package" },
          max_depth: { type: "integer", description: "Maximum depth for output path tracing (default: 5)" }
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
      const response = await guardedCompletionPost(ctx, "anthropic/claude-sonnet-4.6", {
        model: "anthropic/claude-sonnet-4.6",
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
      if (l.startsWith("[")) { const sectionMatch = l.match(/^\[([^\]]+)\]/); section = sectionMatch?.[1]?.trim() || ""; continue; }
      if (section === "package") {
        const nm = l.match(/^name\s*=\s*"([^"]+)"/); if (nm) name = nm[1];
        const vm = l.match(/^version\s*=\s*"([^"]+)"/); if (vm) version = vm[1];
      }
      if (section === "dependencies" || section === "dev-dependencies") {
        const str = l.match(/^([a-zA-Z0-9_-]-*)\s*=\s*"([^"]+)"/); if (str) deps[str[1]!] = str[2]!;
        const tbl = l.match(/^([a-zA-Z0-9_-]-*)\s*=\s*\{[^}]*version\s*=\s*"([^"]+)"/); if (tbl) deps[tbl[1]!] = tbl[2]!;
      }
    }
    return { name, version, deps };
  }

  interface NpmLockfilePackage {
    version?: string;
    dependencies?: Record<string, string>;
  }

  interface NpmLockfile {
    packages?: Record<string, NpmLockfilePackage>;
    dependencies?: Record<string, any>;
  }

  function parseNpmLockfile(content: string): Map<string, { version: string; paths: string[][] }> {
    const resolved = new Map<string, { version: string; paths: string[][] }>();
    let lockfile: NpmLockfile;
    try {
      lockfile = JSON.parse(content);
    } catch {
      return resolved;
    }

    // Modern lockfile v2/v3 flat structure
    if (lockfile.packages) {
      for (const [pkgPath, pkgInfo] of Object.entries(lockfile.packages)) {
        if (pkgPath === "") continue; // Skip root
        const parts = pkgPath.split("node_modules/").map(p => p.replace(/\/$/, "")).filter(Boolean);
        const name = parts.length > 0 ? parts[parts.length - 1] : undefined;
        const version = pkgInfo.version;
        if (name && version) {
          if (!resolved.has(name)) {
            resolved.set(name, { version, paths: [] });
          }
          resolved.get(name)!.paths.push(parts);
        }
      }
    }

    // Classic lockfile v1 nested structure (or fallback for older projects)
    if (lockfile.dependencies && resolved.size === 0) {
      function traverse(deps: any, currentPath: string[]) {
        for (const [name, depInfo] of Object.entries(deps)) {
          const version = (depInfo as any).version;
          const nextPath = [...currentPath, name];
          if (version) {
            if (!resolved.has(name)) {
              resolved.set(name, { version, paths: [] });
            }
            resolved.get(name)!.paths.push(nextPath);
          }
          if ((depInfo as any).dependencies) {
            traverse((depInfo as any).dependencies, nextPath);
          }
        }
      }
      traverse(lockfile.dependencies, []);
    }

    return resolved;
  }

  interface CargoLockPkg {
    name: string;
    version: string;
    dependencies: string[];
  }

  function parseCargoLock(content: string): CargoLockPkg[] {
    const pkgs: CargoLockPkg[] = [];
    const blocks = content.split("[[package]]");
    for (const block of blocks) {
      const nameMatch = block.match(/name\s*=\s*"([^"]+)"/);
      const versionMatch = block.match(/version\s*=\s*"([^"]+)"/);
      if (nameMatch && versionMatch) {
        const name = nameMatch[1] ?? "";
        const version = versionMatch[1] ?? "";
        const deps: string[] = [];
        const depsSection = block.match(/dependencies\s*=\s*\[([\s\S]*?)\]/);
        if (depsSection) {
          const depLines = (depsSection[1] ?? "").split("\n");
          for (const line of depLines) {
            const m = line.match(/"([^"]+)"/);
            if (m) {
              const depName = (m[1] ?? "").split(" ")[0];
              if (depName) deps.push(depName);
            }
          }
        }
        pkgs.push({ name, version, dependencies: deps });
      }
    }
    return pkgs;
  }

  function resolveCargoTransitive(
    content: string,
    rootCandidates: string[],
    maxDepth: number
  ): Map<string, { version: string; paths: string[][] }> {
    const resolved = new Map<string, { version: string; paths: string[][] }>();
    const pkgs = parseCargoLock(content);

    const graph = new Map<string, CargoLockPkg[]>();
    for (const pkg of pkgs) {
      if (!graph.has(pkg.name)) {
        graph.set(pkg.name, []);
      }
      graph.get(pkg.name)!.push(pkg);
      if (!resolved.has(pkg.name)) {
        resolved.set(pkg.name, { version: pkg.version, paths: [] });
      }
    }

    let roots = [...rootCandidates];
    if (roots.length === 0) {
      const dependentSet = new Set<string>();
      for (const pkg of pkgs) {
        for (const d of pkg.dependencies) {
          dependentSet.add(d);
        }
      }
      roots = pkgs.map(p => p.name).filter(name => !dependentSet.has(name));
    }

    function dfs(
      pkgName: string,
      targetName: string,
      currentPath: string[],
      visited: Set<string>,
      allPaths: string[][]
    ) {
      if (currentPath.length > maxDepth) return;
      if (pkgName === targetName) {
        allPaths.push([...currentPath]);
        return;
      }
      const nodes = graph.get(pkgName) || [];
      for (const node of nodes) {
        for (const dep of node.dependencies) {
          const key = `${node.name}@${node.version}->${dep}`;
          if (visited.has(key)) continue;
          visited.add(key);
          dfs(dep, targetName, [...currentPath, dep], visited, allPaths);
          visited.delete(key);
        }
      }
    }

    for (const targetName of resolved.keys()) {
      const allPaths: string[][] = [];
      for (const root of roots) {
        dfs(root, targetName, [root], new Set<string>(), allPaths);
      }
      if (allPaths.length > 0) {
        resolved.get(targetName)!.paths = allPaths;
      } else {
        resolved.get(targetName)!.paths = [[targetName]];
      }
    }

    return resolved;
  }

  async function handleDependencyGraph(args: DependencyGraphArgs) {
    const { 
      repos: filterRepos, 
      check_conflicts = true, 
      include_dev = false,
      transitive = false,
      focus_package,
      max_depth = 5
    } = args;

    try {
      const symbolIndex: SymbolIndex = JSON.parse(await fs.readFile(SYMBOL_INDEX_PATH, "utf-8"));
      const targets = filterRepos?.length ? Object.keys(symbolIndex).filter(n => filterRepos.includes(n)) : Object.keys(symbolIndex);
      
      const repoInfoMap: Record<string, RepoInfo & { transitiveCount?: number }> = {};
      const warnings: string[] = [];
      const resolvedPackageMap = new Map<string, Array<{ repo: string; version: string; paths: string[][] }>>();

      for (const repoName of targets) {
        const repoEntry = symbolIndex[repoName];
        if (!repoEntry) {
          warnings.push(`Project "${repoName}" not found in symbol index.`);
          continue;
        }
        const repoPath = repoEntry.path;
        let isTransitiveResolved = false;

        if (transitive) {
          try {
            const lockfileContent = await fs.readFile(path.join(repoPath, "package-lock.json"), "utf-8");
            const parsed = parseNpmLockfile(lockfileContent);
            
            for (const [pkgName, pkgInfo] of parsed.entries()) {
              if (!resolvedPackageMap.has(pkgName)) {
                resolvedPackageMap.set(pkgName, []);
              }
              const pathsTruncated = pkgInfo.paths.map(p => p.slice(0, max_depth));
              resolvedPackageMap.get(pkgName)!.push({
                repo: repoName,
                version: pkgInfo.version,
                paths: pathsTruncated
              });
            }
            
            repoInfoMap[repoName] = { 
              type: "npm (lockfile)", 
              displayName: repoName, 
              depCount: parsed.size,
              transitiveCount: parsed.size
            };
            isTransitiveResolved = true;
          } catch {
            try {
              const lockfileContent = await fs.readFile(path.join(repoPath, "yarn.lock"), "utf-8");
              const parsed = parseYarnLockfile(lockfileContent);
              for (const [pkgName, pkgInfo] of parsed.entries()) {
                if (!resolvedPackageMap.has(pkgName)) {
                  resolvedPackageMap.set(pkgName, []);
                }
                resolvedPackageMap.get(pkgName)!.push({
                  repo: repoName,
                  version: pkgInfo.version,
                  paths: pkgInfo.paths
                });
              }
              repoInfoMap[repoName] = { 
                type: "yarn (lockfile)", 
                displayName: repoName, 
                depCount: parsed.size,
                transitiveCount: parsed.size
              };
              isTransitiveResolved = true;
            } catch {
              try {
                const lockfileContent = await fs.readFile(path.join(repoPath, "pnpm-lock.yaml"), "utf-8");
                const parsed = parsePnpmLockfile(lockfileContent);
                for (const [pkgName, pkgInfo] of parsed.entries()) {
                  if (!resolvedPackageMap.has(pkgName)) {
                    resolvedPackageMap.set(pkgName, []);
                  }
                  resolvedPackageMap.get(pkgName)!.push({
                    repo: repoName,
                    version: pkgInfo.version,
                    paths: pkgInfo.paths
                  });
                }
                repoInfoMap[repoName] = { 
                  type: "pnpm (lockfile)", 
                  displayName: repoName, 
                  depCount: parsed.size,
                  transitiveCount: parsed.size
                };
                isTransitiveResolved = true;
              } catch {
                try {
                  const lockfileContent = await fs.readFile(path.join(repoPath, "Cargo.lock"), "utf-8");
                  let rootCandidates: string[] = [];
                  try {
                    const cargoToml = parseCargoToml(await fs.readFile(path.join(repoPath, "Cargo.toml"), "utf-8"));
                    if (cargoToml.name) rootCandidates.push(cargoToml.name);
                  } catch {}

                  const parsed = resolveCargoTransitive(lockfileContent, rootCandidates, max_depth);
                  for (const [pkgName, pkgInfo] of parsed.entries()) {
                    if (!resolvedPackageMap.has(pkgName)) {
                      resolvedPackageMap.set(pkgName, []);
                    }
                    resolvedPackageMap.get(pkgName)!.push({
                      repo: repoName,
                      version: pkgInfo.version,
                      paths: pkgInfo.paths
                    });
                  }

                  repoInfoMap[repoName] = { 
                    type: "cargo (lockfile)", 
                    displayName: repoName, 
                    depCount: parsed.size,
                    transitiveCount: parsed.size
                  };
                  isTransitiveResolved = true;
                } catch {
                  warnings.push(`Could not locate or parse lockfile in repository "${repoName}". Falling back to first-level manifest checking.`);
                }
              }
            }
          }
        }

        if (!isTransitiveResolved) {
          try {
            const pkg = JSON.parse(await fs.readFile(path.join(repoPath, "package.json"), "utf-8"));
            const deps = { ...pkg.dependencies, ...(include_dev ? pkg.devDependencies : {}) };
            for (const [n, v] of Object.entries(deps)) {
              if (!resolvedPackageMap.has(n)) resolvedPackageMap.set(n, []);
              resolvedPackageMap.get(n)!.push({ 
                repo: repoName, 
                version: String(v), 
                paths: [[n]] 
              });
            }
            repoInfoMap[repoName] = { type: "npm", displayName: pkg.name || repoName, depCount: Object.keys(deps).length };
          } catch {
            try {
              const cargo = parseCargoToml(await fs.readFile(path.join(repoPath, "Cargo.toml"), "utf-8"));
              for (const [n, v] of Object.entries(cargo.deps)) {
                if (!resolvedPackageMap.has(n)) resolvedPackageMap.set(n, []);
                resolvedPackageMap.get(n)!.push({ 
                  repo: repoName, 
                  version: semver.validRange(v) ? v : `^${v}`, 
                  paths: [[n]] 
                });
              }
              repoInfoMap[repoName] = { type: "cargo", displayName: cargo.name || repoName, depCount: Object.keys(cargo.deps).length };
            } catch {
              repoInfoMap[repoName] = { type: "unknown", displayName: repoName, stubbed: true };
            }
          }
        }
      }

      if (focus_package) {
        const sections = [];
        sections.push(`# 🔍 Targeted Dependency Paths for \`${focus_package}\``);
        
        if (warnings.length > 0) {
          sections.push(`> [!WARNING]\n` + warnings.map(w => `> - ${w}`).join("\n"));
        }

        const entries = resolvedPackageMap.get(focus_package);
        if (!entries || entries.length === 0) {
          sections.push(`No resolved instances of package \`${focus_package}\` were found in the scanned repositories.`);
        } else {
          for (const entry of entries) {
            sections.push(`### 📁 Project: \`${entry.repo}\` (Resolved Version: \`${entry.version}\`)`);
            const pathList = entry.paths.map(p => `  - \`${entry.repo}\` ➔ ` + p.map(node => `\`${node}\``).join(" ➔ ")).join("\n");
            sections.push(pathList);
          }
        }
        return { content: [{ type: "text", text: sections.join("\n\n") }] };
      }

      const shared = [...resolvedPackageMap.entries()].filter(([, entries]) => {
        if (entries.length > 1) return true;
        const versions = new Set(entries.map(e => e.version));
        return versions.size > 1;
      });

      const conflicts: Array<{ pkg: string; a: { repo: string; version: string; paths: string[][] }; b: { repo: string; version: string; paths: string[][] } }> = [];
      if (check_conflicts) {
        for (const [pkg, entries] of shared) {
          for (let i = 0; i < entries.length; i++) {
            for (let j = i + 1; j < entries.length; j++) {
              const entryA = entries[i];
              const entryB = entries[j];
              if (!entryA || !entryB) continue;
              const vA = entryA.version;
              const vB = entryB.version;
              const rangeA = semver.validRange(vA) ? vA : semver.clean(vA) || vA;
              const rangeB = semver.validRange(vB) ? vB : semver.clean(vB) || vB;
              
              const isIntersect = (() => {
                try {
                  return semver.intersects(rangeA, rangeB);
                } catch {
                  return rangeA === rangeB;
                }
              })();

              if (!isIntersect) {
                conflicts.push({ pkg, a: entryA, b: entryB });
              }
            }
          }
        }
      }

      const sections = [];
      const totalScanned = resolvedPackageMap.size;
      sections.push(`## 📊 Summary\nAnalyzed ${targets.length} repos. Scanned ${totalScanned} unique package definitions (direct + transitive). Found ${shared.length} shared/duplicated packages and ${conflicts.length} conflict groups.`);
      
      if (warnings.length > 0) {
        sections.push(`> [!WARNING]\n` + warnings.map(w => `> - ${w}`).join("\n"));
      }

      const repoTable = Object.entries(repoInfoMap).map(([name, info]) => {
        const countStr = info.transitiveCount ? `${info.depCount} (transitive)` : `${info.depCount} (direct)`;
        return `| ${name} | ${info.type} | ${countStr} |`;
      }).join("\n");
      sections.push(`## 📁 Repositories\n| Project | Resolver | Scanned Items |\n|:---|:---|:---|\n${repoTable}`);
      
      if (shared.length > 0) {
        const sharedList = shared.slice(0, 100).map(([pkg, entries]) => {
          const detail = entries.map(e => `\`${e.repo}\` (${e.version})`).join(", ");
          return `- **${pkg}**: Used in ${detail}`;
        }).join("\n");
        const limitNote = shared.length > 100 ? `\n\n*(Truncated: showing first 100 out of ${shared.length} packages)*` : "";
        sections.push(`## 🤝 Shared & Duplicated Packages\n${sharedList}${limitNote}`);
      }
      
      if (conflicts.length > 0) {
        const conflictList = conflicts.map(c => {
          const pathA = c.a.paths.slice(0, 2).map(p => `\`${c.a.repo}\` ➔ ` + p.map(n => `\`${n}\``).join(" ➔ ")).join("<br>");
          const pathB = c.b.paths.slice(0, 2).map(p => `\`${c.b.repo}\` ➔ ` + p.map(n => `\`${n}\``).join(" ➔ ")).join("<br>");
          
          return `### ⚠️ ${c.pkg}\n- **Version \`${c.a.version}\`** (in project \`${c.a.repo}\`):\n  ${pathA}\n- **Version \`${c.b.version}\`** (in project \`${c.b.repo}\`):\n  ${pathB}`;
        }).join("\n\n");
        sections.push(`## 🔴 Transitive Semver Conflicts\n${conflictList}`);
      } else if (check_conflicts) {
        sections.push(`## ✅ Conflicts\nNo semver version conflicts detected across scanned packages.`);
      }

      return { content: [{ type: "text", text: sections.join("\n\n") }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
  }
}
