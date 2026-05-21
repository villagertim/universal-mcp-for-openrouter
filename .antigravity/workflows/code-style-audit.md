# WORKFLOW: Code, Style, and Architecture Audit

**STATUS:** ON-DEMAND ONLY. Do not apply this workflow autonomously.

This workflow is a reference for developers or agents to perform a comprehensive codebase audit to evaluate maintainability, supportability, upgradability, and structural/formatting standards.

---

## Phase 1: The Code Inspector (Maintainability Audit)
**Objective:** Evaluate code complexity, modularity, and technical debt.
- **Action:**
  1. Audit directory structure (`list_dir` or `find`) to ensure proper domain-specific modular separation.
  2. Perform code quality checks: scan for high cognitive complexity, long functions, hardcoded strings, and duplicate blocks.
  3. Documentation Integrity: Verify JSDoc parameters, JSDoc comment blocks, and type declarations.
- **Outcome:** Maintainability grading and a list of key file refactoring recommendations.

## Phase 2: The Systems Engineer (Supportability Audit)
**Objective:** Verify error isolation, observability, and diagnostic accuracy.
- **Action:**
  1. Audit exception boundaries (try/catch blocks) to ensure no standard output (`stdout`) pollution can occur (directing all server logs safely to `console.error` to avoid corrupting the MCP stdio stream).
  2. Inspect self-diagnostics capability: Verify the comprehensiveness of diagnostic scripts (e.g. `verify_setup`).
  3. Validate state databases: Check read/write paths, default creation fallback safety, and permission handling.
- **Outcome:** Supportability grading and observability improvements mapping.

## Phase 3: The Release Manager (Upgradability & Portability Audit)
**Objective:** Inspect cross-platform compatibility, dependencies, and future robustness.
- **Action:**
  1. Dependency checks: Review `package.json` for security vulnerability mitigations, deprecated modules, or runtime environment targets (Node.js engine >= 20.12.0).
  2. Path Portability: Scan the codebase for absolute paths or OS-specific separators, ensuring all operations use relative path utils with tilde home resolution.
  3. API Safety: Audit network requests to verify timeouts, retry rules, circuit breakers, and rate limit structures.
- **Outcome:** Upgradability grading and a dependency/compatibility risk assessment.

## Phase 4: The Best Practices & Formatting Review (Trademark & Formatting Audit)
**Objective:** Evaluate open-source disclaimers, trademark conventions, and licensing formats.
- **Action:**
  1. Inspect source files to ensure standard SPDX headers (`// SPDX-License-Identifier: MIT`) are prepended.
  2. Verify trademark descriptions: Check README.md and main instructions for the "unofficial" identifier prefix and proper trademark disclaimers.
  3. Secret Scan Verification: Ensure the pre-commit secret detection scanner `.githooks/pre-commit` and `.gitignore` are fully active and blocking credential leaks.
- **Outcome:** Best practices alignment check, SPDX header checks, and pre-commit secret scan status.

---

## How to Invoke
A human user may invoke this by saying:
> *"Apply the Code, Style, and Architecture Audit workflow to this repository."*

An agent must load this workflow file with `IsSkillFile: true` and execute the phases sequentially, outputting the results as a premium structured Markdown report (`architecture_audit_report.md`) accompanied by a detailed `task.md` remediation checklist.

---

> [!NOTE]
> **AI-Assisted Review Notice:** Any licensing, copyright, or trademark evaluations outlined in this workflow are AI-assisted reviews of open-source conventions and best practices. They do not constitute formal legal audits or professional legal determinations, which must always be referred to qualified legal counsel.
