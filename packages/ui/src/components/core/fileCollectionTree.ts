import type { FileCollection, FileCollectionNode, FileCollectionSelected } from "../@types";
import { drillPaths } from "./dataValue";

/*
 * Pure helpers behind the `filecollection` element (see
 * `spec/gummy-file-collection-spec.md`): parsing the `list` response,
 * walking the nested tree, the creation-target and drop rules, and the
 * placeholder substitution of the delete confirm. No React, so the studio
 * canvas and the tests share them.
 */

type Raw = Record<string, unknown>;

/**
 * The `list` response → collections. A string body is `JSON.parse`d (twice
 * when the first parse yields a string — a double-encoded legacy path), then
 * `paths` drills to the array. Anything that isn't an array ⇒ `[]`.
 */
export function parseCollections(raw: unknown, paths?: string[]): FileCollection[] {
  let value = raw;
  for (let i = 0; i < 2 && typeof value === "string"; i++) {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  const drilled = paths?.length ? drillPaths(value, paths) : value;
  const list = typeof drilled === "string" ? parseCollections(drilled) : drilled;
  if (!Array.isArray(list)) return [];
  return list.map((c, i) => normalizeCollection(c as Raw, i));
}

function normalizeCollection(c: Raw, index: number): FileCollection {
  const id = String(c.id ?? `collection-${index}`);
  const rawNodes = Array.isArray(c.directories) ? c.directories : Array.isArray(c.children) ? c.children : [];
  return { id, name: String(c.name ?? ""), directories: normalizeNodes(rawNodes as Raw[], id, null) };
}

/** Fills `collectionId` / `parentId` down the tree so every node carries its place. */
export function normalizeNodes(nodes: Raw[], collectionId: string, parentId: string | null): FileCollectionNode[] {
  return nodes.map((n, i) => {
    const id = String(n.id ?? `${parentId ?? collectionId}-${i}`);
    const type: FileCollectionNode["type"] = n.type === "folder" ? "folder" : "file";
    const node: FileCollectionNode = {
      ...(n as object),
      id,
      collectionId: String(n.collectionId ?? collectionId),
      parentId,
      name: String(n.name ?? ""),
      type,
    };
    if (type === "folder") node.children = normalizeNodes(Array.isArray(n.children) ? (n.children as Raw[]) : [], node.collectionId, id);
    else delete node.children;
    return node;
  });
}

/** Files beneath `nodes`, at any depth. */
export function countFiles(nodes: FileCollectionNode[] | undefined): number {
  return (nodes ?? []).reduce((total, n) => total + (n.type === "file" ? 1 : countFiles(n.children)), 0);
}

/** The node with `id` and the collection it lives in, with its ancestor folders (root first). */
export function findNode(
  collections: FileCollection[],
  id: string,
): { node: FileCollectionNode; collection: FileCollection; ancestors: FileCollectionNode[] } | undefined {
  for (const collection of collections) {
    const found = walk(collection.directories, id, []);
    if (found) return { ...found, collection };
  }
  return undefined;
}

function walk(nodes: FileCollectionNode[], id: string, ancestors: FileCollectionNode[]): { node: FileCollectionNode; ancestors: FileCollectionNode[] } | undefined {
  for (const node of nodes) {
    if (node.id === id) return { node, ancestors };
    if (node.children?.length) {
      const found = walk(node.children, id, [...ancestors, node]);
      if (found) return found;
    }
  }
  return undefined;
}

/** The collection with `id`. */
export function findCollection(collections: FileCollection[], id: string): FileCollection | undefined {
  return collections.find((c) => c.id === id);
}

/** The slice value for a node: the node plus its slash-joined `path`. */
export function selectedOf(collections: FileCollection[], id: string): FileCollectionSelected | null {
  const found = findNode(collections, id);
  if (!found) return null;
  const { node, collection, ancestors } = found;
  const { children: _children, ...rest } = node;
  return { ...rest, path: [collection.name, ...ancestors.map((a) => a.name), node.name].join("/") };
}

/** The id of a node and every descendant. */
export function descendantIds(node: FileCollectionNode, acc: Set<string> = new Set()): Set<string> {
  acc.add(node.id);
  for (const child of node.children ?? []) descendantIds(child, acc);
  return acc;
}

/** Every node id in the tree (to drop stale expand / selection state). */
export function allNodeIds(collections: FileCollection[]): Set<string> {
  const acc = new Set<string>();
  for (const c of collections) for (const n of c.directories) descendantIds(n, acc);
  return acc;
}

export type FolderOption = { id: string; label: string };

/**
 * The folders of a collection as "/"-joined paths — the Move to picker's
 * destinations. `exclude` (a folder and its subtree) is skipped so a folder
 * can't be offered itself or its own descendants.
 */
export function flattenFolders(nodes: FileCollectionNode[], exclude: Set<string> = new Set(), prefix: string[] = [], out: FolderOption[] = []): FolderOption[] {
  for (const node of nodes) {
    if (node.type !== "folder" || exclude.has(node.id)) continue;
    const path = [...prefix, node.name];
    out.push({ id: node.id, label: path.join("/") });
    if (node.children?.length) flattenFolders(node.children, exclude, path, out);
  }
  return out;
}

/**
 * Where a New entry from a collection header's **+** lands: the selected
 * folder when it is in that collection, the selected file's parent when the
 * file is, else the collection root (`null`).
 */
export function creationTarget(collections: FileCollection[], collectionId: string, selectedId: string | null): string | null {
  if (!selectedId) return null;
  const found = findNode(collections, selectedId);
  if (!found || found.collection.id !== collectionId) return null;
  return found.node.type === "folder" ? found.node.id : found.node.parentId;
}

export type DropCheck = { ok: true; collectionId: string; parentId: string | null } | { ok: false };

/**
 * Whether dropping `draggedId` into `targetFolderId` (`null` = the root of
 * `targetCollectionId`) is a real move: ignored when the target is in another
 * collection, is the node's current parent, or is the node itself / one of
 * its descendants.
 */
export function checkDrop(collections: FileCollection[], draggedId: string, targetCollectionId: string, targetFolderId: string | null): DropCheck {
  const found = findNode(collections, draggedId);
  if (!found || found.collection.id !== targetCollectionId) return { ok: false };
  if ((found.node.parentId ?? null) === targetFolderId) return { ok: false };
  if (targetFolderId != null && descendantIds(found.node).has(targetFolderId)) return { ok: false };
  if (targetFolderId != null) {
    const target = findNode(collections, targetFolderId);
    if (!target || target.node.type !== "folder") return { ok: false };
  }
  return { ok: true, collectionId: targetCollectionId, parentId: targetFolderId };
}

/** `{{name}}` / `{{count}}` in a confirm description. */
export function substitute(template: string, values: { name: string; count: number }): string {
  return template.replace(/\{\{\s*(name|count)\s*\}\}/g, (_, key: "name" | "count") => String(values[key]));
}

/**
 * The node a create produced, once the re-fetch returned it: the child of
 * `parentId` in `collectionId` named `name` — the newest `createdAt` when
 * several match, else the last one. `undefined` when none matches.
 */
export function findCreated(collections: FileCollection[], collectionId: string, parentId: string | null, name: string): FileCollectionNode | undefined {
  const collection = findCollection(collections, collectionId);
  if (!collection) return undefined;
  const siblings = parentId == null ? collection.directories : findNode(collections, parentId)?.node.children ?? [];
  const matches = siblings.filter((n) => n.name === name);
  if (!matches.length) return undefined;
  return matches.reduce((best, n) => ((n.createdAt ?? 0) >= (best.createdAt ?? 0) ? n : best));
}

/** The icon key for a node: its own `icon`, the kind map, else the structural default. */
export function nodeIcon(node: FileCollectionNode, kindIcons: Record<string, string> | undefined, expanded: boolean): string {
  if (node.icon) return node.icon;
  if (node.kind && kindIcons?.[node.kind]) return kindIcons[node.kind];
  return node.type === "folder" ? (expanded ? "folderOpen" : "folder") : "file";
}
