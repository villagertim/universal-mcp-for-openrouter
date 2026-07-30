import { describe, it, expect } from "vitest";
import { CODE_SKIP_DIRS } from "../../src/config.js";

describe("Watcher & File Search Skip Directories (Phase 1)", () => {
  it("should contain standard build and transient directories in CODE_SKIP_DIRS", () => {
    const expectedDirs = [
      "node_modules",
      ".git",
      "build",
      "dist",
      ".next",
      "vendor",
      "__pycache__",
      "coverage",
      ".venv",
      "target",
      ".turbo",
      ".cache",
      ".output",
      ".nuxt",
      ".svelte-kit",
      ".out",
      "out",
      ".parcel-cache",
      ".idea",
      ".vscode",
    ];

    for (const dir of expectedDirs) {
      expect(CODE_SKIP_DIRS.has(dir)).toBe(true);
    }
  });
});
