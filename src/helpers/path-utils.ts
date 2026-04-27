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
 * Validates that a path is not in a restricted/sensitive location.
 * @throws Error if path is restricted.
 */
export function validatePath(targetPath: string): void {
  const resolved = path.resolve(targetPath);
  for (const restricted of RESTRICTED_PATHS) {
    const resolvedRestricted = path.resolve(restricted);
    if (resolved === resolvedRestricted || resolved.startsWith(resolvedRestricted + path.sep)) {
      throw new Error(`Access denied: "${targetPath}" is a restricted path.`);
    }
  }
}
