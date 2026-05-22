// SPDX-License-Identifier: MIT
import fs from "fs/promises";

async function main() {
  console.log("🚀 Starting peer review of Option E: dependency_graph v2 via local proxy...");

  const prompt = `You are a Senior Principal AI Software Architect and technical peer reviewer.
We are proposing a new feature for our Universal OpenRouter MCP Server:
**Option E: dependency_graph v2 (Transitive Dependencies)**.

### Current Implementation
Currently, the \`dependency_graph\` tool is restricted to first-level manifest checking. It reads direct dependency declarations from \`package.json\` (npm) and \`Cargo.toml\` (Rust) files across directories, mapping overlaps and high-level semver conflicts.

### Proposed Transitive / Deep Dependency Graph Design
We propose upgrading the tool to perform a deep, transitive analysis. If \`transitive: true\` is passed:
1. **NPM Transitive Resolution**: Run \`npm ls --all --json\` asynchronously in the repository's path and recursively parse the nested dependencies.
2. **Cargo Transitive Resolution**: Run \`cargo tree --prefix depth\` in the repository's path and parse the tree structure (deducing depth via line indentation).
3. **Deep Semver Audit**: Track path stacks up to \`max_depth\` (default \`5\`) and group all resolved packages. Perform semver intersection audits across all direct and transitive packages.
4. **Resilient Fallback**: If \`node_modules\` is missing, \`npm\`/\`cargo\` are not installed, or the shell commands fail, the tool will gracefully log a warning and fall back to first-level manifest parsing (\`package.json\` / \`Cargo.toml\`).

### Task for Peer Reviewer
Analyze this proposed implementation plan. Is it actually worth doing?
- What are the pros and cons of this deep transitive resolution?
- Does it overlap with any existing tools?
- Does it provide substantial value to agentic workflows?
- Are the technical solutions for parsing (recursive JSON for npm and indentation-based for cargo) robust and efficient?
- Should we build it? If so, what critical refinements would make it truly valuable?
- Provide a clear recommendation (Approve/Reject/Modify).`;

  try {
    const response = await fetch("http://localhost:4002/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openrouter-auto",
        messages: [
          { role: "system", content: "You are an expert AI architect. Be critical, analytical, and highly structured." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Local proxy responded with status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const resultText = data.choices[0].message.content;

    console.log("\n================ PEER REVIEW REPORT ================");
    console.log(resultText);
    console.log("====================================================");

    // Save the review report to a scratch file
    await fs.writeFile("scratch/peer-review-report-option-e.md", resultText, "utf-8");
    console.log("\nSaved review report to scratch/peer-review-report-option-e.md");
  } catch (error) {
    console.error("❌ Peer review failed:", error);
    process.exit(1);
  }
}

main();
