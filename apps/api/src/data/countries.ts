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
];

let nextId = 11;

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