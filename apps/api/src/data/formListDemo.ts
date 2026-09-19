/**
 * In-memory resources behind the example's Form list demo page: a `contacts`
 * list (full CRUD, seeded) and a `notes` list (starts empty — the demo's
 * empty state). Same shape of service as the countries store.
 */
export interface Contact {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer' | string;
}

export interface Note {
  _id: string;
  text: string;
  createdAt: string;
}

function store<T extends { _id: string }>(prefix: string, initial: T[]) {
  let rows: T[] = initial;
  let nextId = initial.length + 1;
  return {
    list: () => rows,
    create: (data: Omit<T, '_id'>) => {
      const row = { ...data, _id: `${prefix}${nextId++}` } as T;
      rows.push(row);
      return row;
    },
    update: (id: string, data: Partial<Omit<T, '_id'>>) => {
      const index = rows.findIndex((r) => r._id === id);
      if (index === -1) return null;
      rows[index] = { ...rows[index], ...data, _id: id };
      return rows[index];
    },
    delete: (id: string) => {
      const index = rows.findIndex((r) => r._id === id);
      if (index === -1) return false;
      rows.splice(index, 1);
      return true;
    },
  };
}

export const contactService = store<Contact>('c', [
  { _id: 'c1', name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin' },
  { _id: 'c2', name: 'Grace Hopper', email: 'grace@example.com', role: 'editor' },
  { _id: 'c3', name: 'Linus Torvalds', email: 'linus@example.com', role: 'viewer' },
]);

export const noteService = store<Note>('n', []);
