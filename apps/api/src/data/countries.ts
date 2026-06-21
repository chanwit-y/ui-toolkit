export interface Country {
  _id: string;
  name: string;
  code: string;
  avatar: string | { src: string; alt?: string; fallback?: string };
  updated_at: string;
  updated_by_name: string;
}

const flagUrl = (code: string) => `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

// Mock country data store
export let countries: Country[] = [
  { _id: "1", name: "Thailand", code: "TH", avatar: flagUrl("TH"), updated_at: "2025-01-15T10:30:00Z", updated_by_name: "Admin" },
  { _id: "2", name: "United States", code: "US", avatar: flagUrl("US"), updated_at: "2025-01-14T08:15:00Z", updated_by_name: "Admin" },
  { _id: "3", name: "Japan", code: "JP", avatar: { src: flagUrl("JP"), alt: "Japan Flag", fallback: "JP" }, updated_at: "2025-01-13T14:20:00Z", updated_by_name: "Admin" },
  { _id: "4", name: "South Korea", code: "KR", avatar: flagUrl("KR"), updated_at: "2025-01-12T09:45:00Z", updated_by_name: "Admin" },
  { _id: "5", name: "Singapore", code: "SG", avatar: flagUrl("SG"), updated_at: "2025-01-11T16:00:00Z", updated_by_name: "Admin" },
  { _id: "6", name: "Malaysia", code: "MY", avatar: flagUrl("MY"), updated_at: "2025-01-10T11:30:00Z", updated_by_name: "Admin" },
  { _id: "7", name: "Indonesia", code: "ID", avatar: flagUrl("ID"), updated_at: "2025-01-09T13:15:00Z", updated_by_name: "Admin" },
  { _id: "8", name: "Vietnam", code: "VN", avatar: flagUrl("VN"), updated_at: "2025-01-08T10:00:00Z", updated_by_name: "Admin" },
  { _id: "9", name: "Philippines", code: "PH", avatar: flagUrl("PH"), updated_at: "2025-01-07T15:45:00Z", updated_by_name: "Admin" },
  { _id: "10", name: "India", code: "IN", avatar: flagUrl("IN"), updated_at: "2025-01-06T12:30:00Z", updated_by_name: "Admin" },
  { _id: "11", name: "China", code: "CN", avatar: flagUrl("CN"), updated_at: "2025-01-05T09:00:00Z", updated_by_name: "Admin" },
  { _id: "12", name: "United Kingdom", code: "GB", avatar: flagUrl("GB"), updated_at: "2025-01-04T11:10:00Z", updated_by_name: "Admin" },
  { _id: "13", name: "France", code: "FR", avatar: flagUrl("FR"), updated_at: "2025-01-03T13:25:00Z", updated_by_name: "Admin" },
  { _id: "14", name: "Germany", code: "DE", avatar: flagUrl("DE"), updated_at: "2025-01-02T15:40:00Z", updated_by_name: "Admin" },
  { _id: "15", name: "Italy", code: "IT", avatar: flagUrl("IT"), updated_at: "2025-01-01T08:55:00Z", updated_by_name: "Admin" },
  { _id: "16", name: "Spain", code: "ES", avatar: flagUrl("ES"), updated_at: "2024-12-31T10:05:00Z", updated_by_name: "Admin" },
  { _id: "17", name: "Portugal", code: "PT", avatar: flagUrl("PT"), updated_at: "2024-12-30T12:15:00Z", updated_by_name: "Admin" },
  { _id: "18", name: "Netherlands", code: "NL", avatar: flagUrl("NL"), updated_at: "2024-12-29T14:30:00Z", updated_by_name: "Admin" },
  { _id: "19", name: "Belgium", code: "BE", avatar: flagUrl("BE"), updated_at: "2024-12-28T09:20:00Z", updated_by_name: "Admin" },
  { _id: "20", name: "Switzerland", code: "CH", avatar: flagUrl("CH"), updated_at: "2024-12-27T16:45:00Z", updated_by_name: "Admin" },
  { _id: "21", name: "Austria", code: "AT", avatar: flagUrl("AT"), updated_at: "2024-12-26T11:00:00Z", updated_by_name: "Admin" },
  { _id: "22", name: "Sweden", code: "SE", avatar: flagUrl("SE"), updated_at: "2024-12-25T08:30:00Z", updated_by_name: "Admin" },
  { _id: "23", name: "Norway", code: "NO", avatar: flagUrl("NO"), updated_at: "2024-12-24T13:50:00Z", updated_by_name: "Admin" },
  { _id: "24", name: "Denmark", code: "DK", avatar: flagUrl("DK"), updated_at: "2024-12-23T10:40:00Z", updated_by_name: "Admin" },
  { _id: "25", name: "Finland", code: "FI", avatar: flagUrl("FI"), updated_at: "2024-12-22T15:10:00Z", updated_by_name: "Admin" },
  { _id: "26", name: "Poland", code: "PL", avatar: flagUrl("PL"), updated_at: "2024-12-21T09:35:00Z", updated_by_name: "Admin" },
  { _id: "27", name: "Czechia", code: "CZ", avatar: flagUrl("CZ"), updated_at: "2024-12-20T12:00:00Z", updated_by_name: "Admin" },
  { _id: "28", name: "Greece", code: "GR", avatar: flagUrl("GR"), updated_at: "2024-12-19T14:20:00Z", updated_by_name: "Admin" },
  { _id: "29", name: "Turkey", code: "TR", avatar: flagUrl("TR"), updated_at: "2024-12-18T08:45:00Z", updated_by_name: "Admin" },
  { _id: "30", name: "Brazil", code: "BR", avatar: flagUrl("BR"), updated_at: "2024-12-17T11:55:00Z", updated_by_name: "Admin" },
  { _id: "31", name: "Argentina", code: "AR", avatar: flagUrl("AR"), updated_at: "2024-12-16T13:05:00Z", updated_by_name: "Admin" },
  { _id: "32", name: "Mexico", code: "MX", avatar: flagUrl("MX"), updated_at: "2024-12-15T15:30:00Z", updated_by_name: "Admin" },
  { _id: "33", name: "Canada", code: "CA", avatar: flagUrl("CA"), updated_at: "2024-12-14T09:10:00Z", updated_by_name: "Admin" },
  { _id: "34", name: "Australia", code: "AU", avatar: flagUrl("AU"), updated_at: "2024-12-13T12:25:00Z", updated_by_name: "Admin" },
  { _id: "35", name: "New Zealand", code: "NZ", avatar: flagUrl("NZ"), updated_at: "2024-12-12T14:40:00Z", updated_by_name: "Admin" },
  { _id: "36", name: "South Africa", code: "ZA", avatar: flagUrl("ZA"), updated_at: "2024-12-11T08:20:00Z", updated_by_name: "Admin" },
  { _id: "37", name: "Egypt", code: "EG", avatar: flagUrl("EG"), updated_at: "2024-12-10T11:35:00Z", updated_by_name: "Admin" },
  { _id: "38", name: "Saudi Arabia", code: "SA", avatar: flagUrl("SA"), updated_at: "2024-12-09T13:45:00Z", updated_by_name: "Admin" },
  { _id: "39", name: "United Arab Emirates", code: "AE", avatar: flagUrl("AE"), updated_at: "2024-12-08T15:55:00Z", updated_by_name: "Admin" },
  { _id: "40", name: "Qatar", code: "QA", avatar: flagUrl("QA"), updated_at: "2024-12-07T09:30:00Z", updated_by_name: "Admin" },
];

let nextId = 41;

export const countryService = {
  getAll: () => countries,

  search: (term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return countries;

    return countries.filter(
      (country) =>
        country.name.toLowerCase().includes(normalized) ||
        country.code.toLowerCase().includes(normalized)
    );
  },

  /**
   * Server-side pagination + search. Filters by name/code (when a search term
   * is given), then returns one page worth of rows plus the total count of all
   * matching rows (so the client can compute page count).
   */
  getPage: ({ offset = 0, limit = 10, search = "" }: { offset?: number; limit?: number; search?: string }) => {
    const normalized = search.trim().toLowerCase();
    const filtered = normalized
      ? countries.filter(
          (country) =>
            country.name.toLowerCase().includes(normalized) ||
            country.code.toLowerCase().includes(normalized)
        )
      : countries;

    return {
      rows: filtered.slice(offset, offset + limit),
      total: filtered.length,
    };
  },
  
  getById: (id: string) => countries.find((c) => c._id === id) ?? null,

  create: (data: { name: string; code: string }) => {
    const newCountry: Country = {
      _id: String(nextId++),
      name: data.name,
      code: data.code,
      avatar: flagUrl(data.code),
      updated_at: new Date().toISOString(),
      updated_by_name: "Admin",
    };
    countries.push(newCountry);
    return newCountry;
  },
  
  update: (id: string, data: { name?: string; code?: string }) => {
    const index = countries.findIndex(c => c._id === id);
    
    if (index === -1) {
      return null;
    }
    
    countries[index] = {
      ...countries[index],
      ...data,
      updated_at: new Date().toISOString(),
    };
    
    return countries[index];
  },
  
  delete: (id: string) => {
    const index = countries.findIndex(c => c._id === id);
    
    if (index === -1) {
      return false;
    }
    
    countries.splice(index, 1);
    return true;
  }
};