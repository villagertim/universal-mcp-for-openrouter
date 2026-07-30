// SPDX-License-Identifier: MIT

import { ContextEntry } from "../types.js";
import { getVectorStore } from "./vector-store.js";

export async function loadContextStore(): Promise<ContextEntry[]> {
  const store = getVectorStore();
  return (await store.loadItems()) as ContextEntry[];
}

export async function saveContextStore(entries: ContextEntry[]): Promise<void> {
  const store = getVectorStore();
  await store.saveItems(entries as any);
}
