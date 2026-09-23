import type { TModelMaster } from "@gummy-ui/ui";

export const model: TModelMaster = {
  countryRes: {
    data: {
      type: "array",
      collection: {
        _id: "string",
        name: "string",
        code: "string",
        avatar: "any",
        updated_at: "string",
        updated_by_name: "string",
      },
    },
    status: "number",
    success: "boolean",
    message: "string",
  },
  countryPagedRes: {
    data: {
      type: "array",
      collection: {
        _id: "string",
        name: "string",
        code: "string",
        avatar: "any",
        updated_at: "string",
        updated_by_name: "string",
      },
    },
    total: "number",
    status: "number",
    success: "boolean",
    message: "string",
  },
  countryDetailRes: {
    data: {
      type: "object",
      collection: {
        _id: "string",
        name: "string",
        code: "string",
        avatar: "any",
        updated_at: "string",
        updated_by_name: "string",
      },
    },
    status: "number",
    success: "boolean",
    message: "string",
  },
  // Page request. Beyond offset/limit/search the mock API takes the custom
  // filters (`name` contains, `code` equals, `updatedBy` one-of) and the server
  // sort (`sortBy` + `sortDir`) — see the Server filter & sort demo page.
  countryPageBody: {
    offset: "number",
    limit: "number",
    search: "string",
    name: "string",
    code: "string",
    updatedBy: "any",
    codes: "any",
    sortBy: "string",
    sortDir: "string",
  },
  // The same page request as a query string (GET /collection/page?offset&limit&search).
  countryPageQuery: {
    offset: "number",
    limit: "number",
    search: "string",
    name: "string",
    code: "string",
    updatedBy: "any",
    codes: "any",
    sortBy: "string",
    sortDir: "string",
  },
  // GET /collection/region/:region/page — `:region` is a region id or "all".
  regionPageParams: {
    region: "string",
  },
  countryBody: {
    name: "string",
    code: "string",
    flagImage: "string",
    documents: {
      type: "array",
      collection: {
        name: "string",
        size: "number",
        type: "string",
        data: "string",
      },
    },
  },
  countryParam: {
    id: "string",
  },
  countrySearchQuery: {
    search: "string",
  },
  // Languages of a country (FormList demo on the detail page).
  languageRes: {
    data: {
      type: "array",
      collection: {
        _id: "string",
        countryId: "string",
        country: "string",
        name: "string",
      },
    },
    status: "number",
    success: "boolean",
    message: "string",
  },
  languageBody: {
    country: "string",
    name: "string",
  },
  languageCountryParam: {
    country: "string",
  },
  languageParam: {
    country: "string",
    id: "string",
  },
  // Form list demo page (`/form-list`): contacts (full CRUD) and notes.
  contactRes: {
    data: {
      type: "array",
      collection: { _id: "string", name: "string", email: "string", role: "string" },
    },
    status: "number",
    success: "boolean",
    message: "string",
  },
  contactBody: {
    name: "string",
    email: "string",
    role: "string",
  },
  noteRes: {
    data: {
      type: "array",
      collection: { _id: "string", text: "string", createdAt: "string" },
    },
    status: "number",
    success: "boolean",
    message: "string",
  },
  noteBody: {
    text: "string",
  },
  idParam: {
    id: "string",
  },
  // One flat row per country with its region (Table layout demo: merged
  // cells and group headers).
  regionCountryRes: {
    data: {
      type: "array",
      collection: {
        _id: "string",
        region: "string",
        regionId: "string",
        name: "string",
        code: "string",
        created_by_name: "string",
        updated_by_name: "string",
        created_at: "string",
        updated_at: "string",
      },
    },
    status: "number",
    success: "boolean",
    message: "string",
  },
  // Regions with their countries (Repeater demo — nested repeater source).
  regionRes: {
    data: {
      type: "array",
      collection: {
        _id: "string",
        name: "string",
        description: "string",
        about: "string",
        featured: "boolean",
        countries: {
          type: "array",
          collection: {
            _id: "string",
            name: "string",
            code: "string",
            avatar: "any",
          },
        },
      },
    },
    status: "number",
    success: "boolean",
    message: "string",
  },
};
