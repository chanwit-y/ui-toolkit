/**
 * In-memory store behind the example's File collection demo page: a few
 * collections of folders and files. Nodes are kept flat and nested on read,
 * so moves and deletes are one-field edits. Deterministic seed.
 */
export interface FileNode {
  id: string;
  collectionId: string;
  parentId: string | null;
  name: string;
  type: 'folder' | 'file';
  kind: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Collection {
  id: string;
  name: string;
}

const T0 = Date.UTC(2026, 0, 1);

const collections: Collection[] = [
  { id: 'c1', name: 'Catalog' },
  { id: 'c2', name: 'Marketing' },
  { id: 'c3', name: 'Legal' },
];

let seq = 0;
const node = (collectionId: string, parentId: string | null, name: string, type: FileNode['type'], kind: string | null = null): FileNode => {
  seq += 1;
  return { id: `n${seq}`, collectionId, parentId, name, type, kind, createdAt: T0 + seq * 60_000, updatedAt: T0 + seq * 60_000 };
};

const nodes: FileNode[] = [];
const add = (n: FileNode) => (nodes.push(n), n);

const y2026 = add(node('c1', null, '2026', 'folder'));
const q1 = add(node('c1', y2026.id, 'Q1', 'folder'));
add(node('c1', q1.id, 'Q1 price list', 'file', 'sheet'));
add(node('c1', q1.id, 'Q1 cover', 'file', 'image'));
add(node('c1', y2026.id, 'Q2 price list', 'file', 'sheet'));
const y2025 = add(node('c1', null, '2025', 'folder'));
add(node('c1', y2025.id, 'Archive notes', 'file', 'markdown'));
add(node('c1', null, 'README', 'file', 'markdown'));

const campaigns = add(node('c2', null, 'Campaigns', 'folder'));
add(node('c2', campaigns.id, 'Spring launch', 'file', 'markdown'));
add(node('c2', campaigns.id, 'Hero banner', 'file', 'image'));
add(node('c2', null, 'Brand guide', 'file', 'markdown'));
add(node('c2', null, 'Empty folder', 'folder'));

let next = seq + 1;
const newId = () => `n${next++}`;
let collectionNext = collections.length + 1;

export type NestedNode = Omit<FileNode, 'parentId'> & { parentId: string | null; children?: NestedNode[] };

function nest(collectionId: string, parentId: string | null): NestedNode[] {
  return nodes
    .filter((n) => n.collectionId === collectionId && n.parentId === parentId)
    .map((n) => (n.type === 'folder' ? { ...n, children: nest(collectionId, n.id) } : { ...n }));
}

function descendants(id: string, acc: string[] = []): string[] {
  for (const n of nodes) if (n.parentId === id) { acc.push(n.id); descendants(n.id, acc); }
  return acc;
}

export const fileCollectionService = {
  list: () => collections.map((c) => ({ ...c, directories: nest(c.id, null) })),

  createCollection: (name: string) => {
    const c = { id: `c${collectionNext++}`, name };
    collections.push(c);
    return c;
  },
  renameCollection: (id: string, name: string) => {
    const c = collections.find((x) => x.id === id);
    if (!c) return null;
    c.name = name;
    return c;
  },
  deleteCollection: (id: string) => {
    const index = collections.findIndex((x) => x.id === id);
    if (index === -1) return false;
    collections.splice(index, 1);
    for (let i = nodes.length - 1; i >= 0; i--) if (nodes[i].collectionId === id) nodes.splice(i, 1);
    return true;
  },

  getNode: (id: string) => nodes.find((n) => n.id === id) ?? null,
  createItem: (data: { collectionId: string; parentId: string | null; name: string; type: FileNode['type']; kind?: string | null }) => {
    if (!collections.some((c) => c.id === data.collectionId)) return { error: 'Collection not found' } as const;
    if (data.parentId != null) {
      const parent = nodes.find((n) => n.id === data.parentId);
      if (!parent || parent.type !== 'folder' || parent.collectionId !== data.collectionId) return { error: 'Parent folder not found' } as const;
    }
    const now = Date.now();
    const n: FileNode = { id: newId(), collectionId: data.collectionId, parentId: data.parentId ?? null, name: data.name, type: data.type, kind: data.kind ?? null, createdAt: now, updatedAt: now };
    nodes.push(n);
    return { node: n } as const;
  },
  renameItem: (id: string, name: string) => {
    const n = nodes.find((x) => x.id === id);
    if (!n) return null;
    n.name = name;
    n.updatedAt = Date.now();
    return n;
  },
  moveItem: (id: string, collectionId: string, parentId: string | null) => {
    const n = nodes.find((x) => x.id === id);
    if (!n) return { error: 'Item not found', status: 404 } as const;
    if (!collections.some((c) => c.id === collectionId)) return { error: 'Collection not found', status: 404 } as const;
    if (parentId != null) {
      const parent = nodes.find((x) => x.id === parentId);
      if (!parent || parent.type !== 'folder' || parent.collectionId !== collectionId) return { error: 'Destination folder not found', status: 404 } as const;
      if (parentId === id || descendants(id).includes(parentId)) return { error: 'A folder cannot be moved into itself', status: 400 } as const;
    }
    const moved = [n, ...descendants(id).map((d) => nodes.find((x) => x.id === d)!)];
    for (const m of moved) m.collectionId = collectionId;
    n.parentId = parentId;
    n.updatedAt = Date.now();
    return { node: n } as const;
  },
  duplicateItem: (id: string) => {
    const n = nodes.find((x) => x.id === id);
    if (!n) return { error: 'Item not found', status: 404 } as const;
    if (n.type !== 'file') return { error: 'Only files can be duplicated', status: 400 } as const;
    const now = Date.now();
    const copy: FileNode = { ...n, id: newId(), name: `${n.name} (copy)`, createdAt: now, updatedAt: now };
    nodes.push(copy);
    return { node: copy } as const;
  },
  deleteItem: (id: string) => {
    const index = nodes.findIndex((x) => x.id === id);
    if (index === -1) return { error: 'Item not found', status: 404 } as const;
    if (nodes[index].type === 'folder' && nodes.some((x) => x.parentId === id)) return { error: 'Folder is not empty', status: 409 } as const;
    nodes.splice(index, 1);
    return { ok: true } as const;
  },
};
