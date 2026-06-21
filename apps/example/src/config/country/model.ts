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
};
