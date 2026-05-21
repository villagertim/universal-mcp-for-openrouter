// SPDX-License-Identifier: MIT

import fs from "fs/promises";
import { RATE_CONFIG_PATH, DEFAULT_RATE_CONFIG } from "../config.js";
import { RateLimiterConfig } from "../types.js";

export async function loadRateConfig(): Promise<RateLimiterConfig> {
  try {
    const data = await fs.readFile(RATE_CONFIG_PATH, "utf-8");
    return { ...DEFAULT_RATE_CONFIG, ...JSON.parse(data) };
  } catch {
    return { ...DEFAULT_RATE_CONFIG };
  }
}

export async function saveRateConfig(config: RateLimiterConfig): Promise<void> {
  await fs.writeFile(RATE_CONFIG_PATH, JSON.stringify(config, null, 2));
}
