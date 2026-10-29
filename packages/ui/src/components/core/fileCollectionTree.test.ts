import { describe, expect, test } from "bun:test";
import type { FileCollection } from "../@types";
import {
  checkDrop,
  countFiles,
  creationTarget,
  findCreated,
  flattenFolders,
  nodeIcon,
  parseCollections,
  selectedOf,
  substitute,
} from "./fileCollectionTree";

const raw = [
  {
    id: "c1",
    name: "Catalog",
    directories: [
      { id: "f1", name: "2026", type: "folder", children: [{ id: "i1", name: "Q1 price list", type: "file", kind: "sheet", createdAt: 1 }] },
      { id: "i2", name: "README", type: "file", kind: "markdown" },
      { id: "f2", name: "Archive", type: "folder", children: [{ id: "f3", name: "2025", type: "folder", children: [] }] },
    ],
  },
  { id: "c2", name: "Legal", directories: [] },
];

const tree = (): FileCollection[] => parseCollections(raw);

describe("parseCollections", () => {
  test("fills collectionId / parentId down the tree", () => {
    const t = tree();
    expect(t[0].directories[0].parentId).toBeNull();
    expect(t[0].directories[0].children?.[0]).toMatchObject({ collectionId: "c1", parentId: "f1" });
    expect(t[0].directories[1].children).toBeUndefined();
  });
  test("tolerates a string body, double-encoded, and a wrapped response", () => {
    expect(parseCollections(JSON.stringify(raw))).toHaveLength(2);
    expect(parseCollections(JSON.stringify(JSON.stringify(raw)))).toHaveLength(2);
    expect(parseCollections({ data: raw }, ["data"])).toHaveLength(2);
    expect(parseCollections({ data: JSON.stringify(raw) }, ["data"])).toHaveLength(2);
    expect(parseCollections("not json")).toEqual([]);
    expect(parseCollections({ data: 3 }, ["data"])).toEqual([]);
  });
});

describe("tree helpers", () => {
  test("countFiles counts at any depth", () => {
    expect(countFiles(tree()[0].directories)).toBe(2);
  });
  test("selectedOf carries the slash-joined path and no children", () => {
    expect(selectedOf(tree(), "i1")).toMatchObject({ id: "i1", path: "Catalog/2026/Q1 price list", parentId: "f1" });
    expect(selectedOf(tree(), "f1")).not.toHaveProperty("children");
    expect(selectedOf(tree(), "nope")).toBeNull();
  });
  test("flattenFolders joins paths and skips the excluded subtree", () => {
    expect(flattenFolders(tree()[0].directories).map((f) => f.label)).toEqual(["2026", "Archive", "Archive/2025"]);
    expect(flattenFolders(tree()[0].directories, new Set(["f2"])).map((f) => f.label)).toEqual(["2026"]);
  });
  test("creationTarget follows the selection within the collection", () => {
    expect(creationTarget(tree(), "c1", null)).toBeNull();
    expect(creationTarget(tree(), "c1", "f1")).toBe("f1");
    expect(creationTarget(tree(), "c1", "i1")).toBe("f1");
    expect(creationTarget(tree(), "c1", "i2")).toBeNull();
    expect(creationTarget(tree(), "c2", "f1")).toBeNull();
  });
  test("checkDrop ignores the invalid cases", () => {
    expect(checkDrop(tree(), "i2", "c1", "f1")).toEqual({ ok: true, collectionId: "c1", parentId: "f1" });
    expect(checkDrop(tree(), "i1", "c1", null)).toEqual({ ok: true, collectionId: "c1", parentId: null });
    expect(checkDrop(tree(), "i1", "c1", "f1").ok).toBe(false); // current parent
    expect(checkDrop(tree(), "i2", "c2", null).ok).toBe(false); // other collection
    expect(checkDrop(tree(), "f2", "c1", "f3").ok).toBe(false); // own descendant
    expect(checkDrop(tree(), "f2", "c1", "f2").ok).toBe(false); // itself
    expect(checkDrop(tree(), "i2", "c1", "i1").ok).toBe(false); // a file
  });
  test("findCreated picks the newest match under the target", () => {
    const t = tree();
    t[0].directories[0].children!.push({ id: "i9", collectionId: "c1", parentId: "f1", name: "Q1 price list", type: "file", createdAt: 5 });
    expect(findCreated(t, "c1", "f1", "Q1 price list")?.id).toBe("i9");
    expect(findCreated(t, "c1", null, "README")?.id).toBe("i2");
    expect(findCreated(t, "c1", null, "missing")).toBeUndefined();
  });
  test("substitute and nodeIcon", () => {
    expect(substitute('Delete "{{name}}" and its {{ count }} files?', { name: "A", count: 3 })).toBe('Delete "A" and its 3 files?');
    const t = tree();
    expect(nodeIcon(t[0].directories[0], undefined, false)).toBe("folder");
    expect(nodeIcon(t[0].directories[0], undefined, true)).toBe("folderOpen");
    expect(nodeIcon(t[0].directories[1], { markdown: "fileText" }, false)).toBe("fileText");
    expect(nodeIcon({ ...t[0].directories[1], icon: "star" }, { markdown: "fileText" }, false)).toBe("star");
  });
});
