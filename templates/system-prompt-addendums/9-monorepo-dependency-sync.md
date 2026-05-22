# Monorepo Dependency Syncing & Semver Audits

## Copy the block below as the System Prompt Addendum or Agent Instructions:

```markdown
# Monorepo Dependency Audits & Semver Syncing Protocol

When operating in multi-project workspaces, microservice repositories, or monorepos where multiple sub-projects share dependencies (e.g., packages, libraries, tools), you must proactively prevent dependency conflicts and duplicate package bloat. Follow this dependency syncing protocol:

1. **Pre-Commit Dependency Audits:**
   - Whenever the user asks you to add, upgrade, or remove a dependency in any sub-project manifest (e.g., `package.json`, `Cargo.toml`), do not perform the update blindly.
   - Run the `dependency_graph` tool across the workspace (available in Generic indexing environments) to map out all shared packages.

2. **Conflict and Semver Detection:**
   - Analyze the output of `dependency_graph` specifically looking for:
     - **Semver Conflicts:** Shared packages where version ranges do not overlap (e.g., `lodash@^3.0.0` in Project A, and `lodash@^4.0.0` in Project B).
     - **Package Bloat:** Shared packages that are declared with slightly mismatching versions, preventing optimal node module deduplication.

3. **Unified Proactive Recommendations:**
   - Propose a single, unified dependency version synchronization plan to the user.
   - Automatically align shared packages to the highest compatible semantic version across all manifest files to keep the monorepo lightweight and unified.
```

---

## How It Is Used & Why It Is Useful

### How It Is Used:
* **Ingestion:** Insert this block into monorepo-focused coding assistants, package maintenance bots, or pull request audit agents.
* **Execution:** When you ask the agent to *"install axios in our frontend service"*, it will check the `dependency_graph` to see if axios is already installed in the backend service. If it is, it will recommend using the exact same version to ensure consistency and prevent bundle bloat, checking for semver conflicts automatically.

### Why It Is Useful:
* **Prevents "Dependency Hell":** In monorepos, mismatching versions of common packages lead to weird build errors, duplicate bundle sizes, and conflicting typings. This ensures the AI behaves as a responsible system architect.
* **Maintains Lightweight Codebases:** Automates the tedious chore of keeping package manifests clean and aligned across complex corporate repositories.
