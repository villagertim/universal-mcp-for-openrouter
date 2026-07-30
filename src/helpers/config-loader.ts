// SPDX-License-Identifier: MIT

import fs from "fs/promises";
import path from "path";
import { CONFIG_FILE_PATH, PROFILES_DIR } from "../config.js";

export interface ToolConfig {
  [toolName: string]: boolean;
}

export async function loadToolConfig(): Promise<{ config: ToolConfig; profileName: string }> {
  let profileName = "default";
  let configPath = CONFIG_FILE_PATH;

  // Check for --profile arg
  const profileArgIndex = process.argv.indexOf("--profile");
  if (profileArgIndex !== -1) {
    const profileValue = process.argv[profileArgIndex + 1];
    if (profileValue) {
      profileName = profileValue;
      configPath = path.join(PROFILES_DIR, `${profileName}.json`);
    }
  }

  try {
    const data = await fs.readFile(configPath, "utf-8");
    const raw = JSON.parse(data);
    
    // Filter non-boolean values (e.g. "_comment")
    const config = Object.fromEntries(
      Object.entries(raw).filter(([, v]) => typeof v === "boolean")
    ) as ToolConfig;

    return { config, profileName };
  } catch (error) {
    // If default config doesn't exist, it's fine. If profile doesn't exist, warn.
    if (profileName !== "default") {
      console.error(`[Config] Error loading profile "${profileName}" from ${configPath}:`, error);
    }
  }

  return { config: {}, profileName: profileName === "default" ? "default" : `${profileName} (not found)` };
}
