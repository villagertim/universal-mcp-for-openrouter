# Monorepo Dependency Syncing & Transitive Lockfile Audits

## Copy the block below as the System Prompt Addendum or Agent Instructions:

```markdown
# Monorepo Dependency Audits & Transitive Syncing Protocol

When operating in multi-project workspaces, microservice repositories, or monorepos where multiple sub-projects share dependencies (e.g., packages, libraries, tools), you must proactively prevent transitive conflicts and duplicate package bloat. Follow this dependency syncing protocol:

1. **Perform Transitive Dependency Audits:**
   - Whenever the user asks you to add, upgrade, or remove a dependency in any sub-project manifest (e.g., `package.json`, `Cargo.toml`), do not perform the update blindly.
   - Run the `dependency_graph` tool with `transitive: true` enabled across the workspace. 
   - This parses the actual project lockfiles (`package-lock.json` and `Cargo.lock`) offline and in-process, sweeping thousands of transitive dependencies in sub-milliseconds.

2. **Isolate Targeted Traces & Conflict Resolution:**
   - If common packages are duplicated or conflict, call `dependency_graph` with a targeted `focus_package` argument.
   - Trace the exact dependency path from in-degree zero project roots down to the target package to identify which root manifest definitions pulled in the conflicting versions.
   - Analyze semver overlap and identify overlapping range conflicts.

3. **Unified Proactive Recommendations:**
   - Propose a single, unified dependency version synchronization plan to the user.
   - Automatically align shared packages to the highest compatible semantic version across all manifest files to keep the monorepo lightweight and unified.
```

---

## How It Is Used & Why It Is Useful

### How It Is Used:
* **Ingestion:** Insert this block into monorepo-focused coding assistants, package maintenance bots, or pull request audit agents.
* **Execution:** When you ask the agent to *"install axios in our frontend service"*, it calls `dependency_graph(transitive: true)`. It discovers that a deep transitive dependency of another project (`npm-proj-a -> accepts -> mime-types`) has a version overlap conflict with a root dependency in your new service. It recommends aligning versions at the root level to prevent bundle bloat.

### Why It Is Useful:
* **Sub-Millisecond Offline Sweeps:** Standard tools run heavy, external CLI-based commands like `npm ls` or `cargo tree` which consume CPU and trigger timeouts in agent environments. The native lockfile parser operates entirely in-process and natively, achieving maximum execution speeds and absolute environment security.
* **Isolates Root Culprits:** In nested dependency trees, it is extremely difficult to know *why* a certain version of a library was pulled in. Trace path arrays (`project -> package-a -> package-b -> target`) show you exactly who pulled in the culprit, making resolution simple.
* **Prevents Concurrency/Build Failures:** Aligning transitive lockfiles prevents runtime duplicate package errors and type check collisions during monorepo builds.
