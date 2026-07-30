// SPDX-License-Identifier: MIT

import fs from "fs/promises";
import { CONTEXT_STORE_PATH } from "../config.js";
import { ContextEntry } from "../types.js";

export interface VectorItem extends ContextEntry {
  [key: string]: any;
}

export interface VectorStoreQueryOptions {
  tag?: string;
  project?: string;
  topK?: number;
}

export interface VectorStore {
  loadItems(): Promise<VectorItem[]>;
  saveItems(items: VectorItem[]): Promise<void>;
  queryItems(options?: VectorStoreQueryOptions): Promise<VectorItem[]>;
  clearStore(): Promise<void>;
}

let writeQueue: Promise<void> = Promise.resolve();

export class JsonVectorStore implements VectorStore {
  private filePath: string;

  constructor(filePath: string = CONTEXT_STORE_PATH) {
    this.filePath = filePath;
  }

  async loadItems(): Promise<VectorItem[]> {
    try {
      const data = await fs.readFile(this.filePath, "utf-8");
      return JSON.parse(data) as VectorItem[];
    } catch {
      return [];
    }
  }

  async saveItems(items: VectorItem[]): Promise<void> {
    writeQueue = writeQueue.then(async () => {
      await fs.writeFile(this.filePath, JSON.stringify(items, null, 2), "utf-8");
    }).catch((err) => {
      console.error("[JsonVectorStore] Write failed:", err);
    });

    return writeQueue;
  }

  async queryItems(options?: VectorStoreQueryOptions): Promise<VectorItem[]> {
    const items = await this.loadItems();
    if (!options) return items;

    let filtered = items;
    if (options.tag) {
      filtered = filtered.filter((i) => i.tag === options.tag);
    }
    if (options.project) {
      filtered = filtered.filter((i) => i.project === options.project);
    }
    if (options.topK && options.topK > 0) {
      filtered = filtered.slice(0, options.topK);
    }
    return filtered;
  }

  async clearStore(): Promise<void> {
    await this.saveItems([]);
  }
}

let defaultStoreInstance: VectorStore | null = null;

export function getVectorStore(): VectorStore {
  if (!defaultStoreInstance) {
    defaultStoreInstance = new JsonVectorStore();
  }
  return defaultStoreInstance;
}
