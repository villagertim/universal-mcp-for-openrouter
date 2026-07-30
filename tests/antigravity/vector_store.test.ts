import { describe, it, expect, vi, beforeEach } from "vitest";
import { JsonVectorStore, getVectorStore } from "../../src/helpers/vector-store.js";
import fs from "fs/promises";

vi.mock("fs/promises");

describe("VectorStore Abstraction (Phase 4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should load items via JsonVectorStore", async () => {
    const fakeData = [
      { text: "Item 1", tag: "tag1", project: "prjA" },
      { text: "Item 2", tag: "tag2", project: "prjB" },
    ];
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(fakeData));

    const store = new JsonVectorStore("/mock/path.json");
    const items = await store.loadItems();

    expect(items.length).toBe(2);
    expect(items[0].text).toBe("Item 1");
  });

  it("should filter items by tag and project in queryItems", async () => {
    const fakeData = [
      { text: "Item 1", tag: "decision", project: "auth" },
      { text: "Item 2", tag: "note", project: "auth" },
      { text: "Item 3", tag: "decision", project: "db" },
    ];
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(fakeData));

    const store = new JsonVectorStore("/mock/path.json");
    const filtered = await store.queryItems({ tag: "decision", project: "auth" });

    expect(filtered.length).toBe(1);
    expect(filtered[0].text).toBe("Item 1");
  });

  it("should save items queued to disk", async () => {
    vi.mocked(fs.writeFile).mockResolvedValue(undefined as any);

    const store = new JsonVectorStore("/mock/path.json");
    await store.saveItems([{ text: "New Item", tag: "test" }]);

    expect(fs.writeFile).toHaveBeenCalled();
  });

  it("should return singleton vector store instance from getVectorStore", () => {
    const s1 = getVectorStore();
    const s2 = getVectorStore();

    expect(s1).toBe(s2);
  });
});
