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
  countryPageBody: {
    offset: "number",
    limit: "number",
    search: "string",
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
  // Regions with their countries (Repeater demo — nested repeater source).
  regionRes: {
    data: {
      type: "array",
      collection: {
        _id: "string",
        name: "string",
        description: "string",
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
