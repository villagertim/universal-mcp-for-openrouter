// SPDX-License-Identifier: MIT

import fs from "fs/promises";
import { ContextEntry } from "../types.js";
import { CONTEXT_STORE_PATH } from "../config.js";

export async function loadContextStore(): Promise<ContextEntry[]> {
  try {
    const data = await fs.readFile(CONTEXT_STORE_PATH, "utf-8");
    return JSON.parse(data) as ContextEntry[];
  } catch {
    return [];
  }
}

let writeQueue: Promise<void> = Promise.resolve();

export async function saveContextStore(entries: ContextEntry[]): Promise<void> {
  // Use a simple queue to prevent race conditions during concurrent writes
  writeQueue = writeQueue.then(async () => {
    await fs.writeFile(CONTEXT_STORE_PATH, JSON.stringify(entries, null, 2));
  }).catch(err => {
    console.error("[ContextStore] Write failed:", err);
  });
  
  return writeQueue;
}
