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
 * Expands symbolic home directories (e.g., ~/ or ~) to absolute paths.
 */
export function resolveHomePath(targetPath: string): string {
  if (targetPath === "~") {
    return os.homedir();
  }
  if (targetPath.startsWith("~" + path.sep)) {
    return path.join(os.homedir(), targetPath.slice(2));
  }
  if (targetPath.startsWith("~/")) {
    return path.join(os.homedir(), targetPath.slice(2));
  }
  return targetPath;
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

