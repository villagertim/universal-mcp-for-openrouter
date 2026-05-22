// SPDX-License-Identifier: MIT

import path from "path";
import os from "os";

const RESTRICTED_PATHS = [
  path.join(os.homedir(), ".ssh"),
  path.join(os.homedir(), ".aws"),
  path.join(os.homedir(), ".gnupg"),
  "/etc/shadow",
  "/etc/passwd",
];

/**
 * Expands symbolic home directories (e.g., ~/ or ~) and environment variables (e.g., $HOME, %USERPROFILE%) to absolute paths.
 */
export function resolveHomePath(targetPath: string): string {
  let resolved = targetPath;

  // 1. Expand ~ and ~/ prefixes
  if (resolved === "~") {
    resolved = os.homedir();
  } else if (resolved.startsWith("~" + path.sep) || resolved.startsWith("~/")) {
    resolved = path.join(os.homedir(), resolved.slice(2));
  }

  // 2. Expand Unix environment variables ($VAR)
  resolved = resolved.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
    return process.env[name] || "";
  });

  // 3. Expand Windows environment variables (%VAR%)
  resolved = resolved.replace(/%([^%]+)%/g, (_, name) => {
    return process.env[name] || "";
  });

  return resolved;
}

/**
 * Validates that a path is not in a restricted/sensitive location.
 * @throws Error if path is restricted.
 */
export function validatePath(targetPath: string): void {
  const expanded = resolveHomePath(targetPath);
  const resolved = path.resolve(expanded);
  for (const restricted of RESTRICTED_PATHS) {
    const resolvedRestricted = path.resolve(restricted);
    if (resolved === resolvedRestricted || resolved.startsWith(resolvedRestricted + path.sep)) {
      throw new Error(`Access denied: "${targetPath}" is a restricted path.`);
    }
  }
}

