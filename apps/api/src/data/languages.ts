import { countries } from './countries.js';

/** One language spoken in a country — the rows behind the FormList demo. */
export interface Language {
  _id: string;
  /** Owning country `_id`. */
  countryId: string;
  country: string;
  name: string;
}

let languages: Language[] = [
  { _id: 'l1', countryId: '1', country: 'Thailand', name: 'ภาษาไทย' },
  { _id: 'l2', countryId: '1', country: 'Thailand', name: 'English' },
  { _id: 'l3', countryId: '11', country: 'China', name: '普通话' },
  { _id: 'l4', countryId: '3', country: 'Japan', name: '日本語' },
];

let nextId = 5;

/** A country by `_id` or ISO code (the studio routes by code, the example by id). */
function resolveCountryId(country: string): string | null {
  const key = country.trim();
  const hit = countries.find((c) => c._id === key || c.code.toLowerCase() === key.toLowerCase());
  return hit ? hit._id : null;
}

export const languageService = {
  resolveCountryId,

  listByCountry: (country: string) => {
    const id = resolveCountryId(country);
    return id ? languages.filter((l) => l.countryId === id) : [];
  },

  create: (country: string, data: { country?: string; name: string }) => {
    const id = resolveCountryId(country);
    if (!id) return null;
    const owner = countries.find((c) => c._id === id)!;
    const row: Language = {
      _id: `l${nextId++}`,
      countryId: id,
      country: data.country?.trim() || owner.name,
      name: data.name,
    };
    languages.push(row);
    return row;
  },

  update: (country: string, langId: string, data: { country?: string; name?: string }) => {
    const id = resolveCountryId(country);
    const index = languages.findIndex((l) => l._id === langId && (!id || l.countryId === id));
    if (index === -1) return null;
    const { country: c, name } = data;
    languages[index] = {
      ...languages[index],
      ...(c !== undefined ? { country: c } : {}),
      ...(name !== undefined ? { name } : {}),
    };
    return languages[index];
  },

  delete: (country: string, langId: string) => {
    const id = resolveCountryId(country);
    const index = languages.findIndex((l) => l._id === langId && (!id || l.countryId === id));
    if (index === -1) return false;
    languages.splice(index, 1);
    return true;
  },
};
