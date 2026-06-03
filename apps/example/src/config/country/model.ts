import type { TModelMaster } from "@gummy-ui/ui";

export const model: TModelMaster = {
  countryRes: {
    data: {
      type: "array",
      collection: {
        id: "number",
        name: "string",
      },
    },
    status: "number",
    success: "boolean",
    message: "string",
  },
  countryBody: {
    name: "string",
    code: "string",
  },
  countryParam: {
    id: "string",
  },
};
