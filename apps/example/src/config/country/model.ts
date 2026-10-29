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
        // Figures the Formats page shows (`config/country/formatsDemo.ts`).
        population: "number",
        area_km2: "number",
        gdp_usd: "number",
        growth: "number",
        growth_pts: "number",
        landlocked: "boolean",
        created_at: "string",
        joined_at: "string",
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
        image: "string",
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
  // One region without its country list (Page data demo — chained load).
  regionDetailRes: {
    data: {
      type: "object",
      collection: {
        _id: "string",
        name: "string",
        description: "string",
        about: "string",
        featured: "boolean",
        size: "number",
      },
    },
    status: "number",
    success: "boolean",
    message: "string",
  },
  regionByCountryParams: {
    code: "string",
  },
  // Approval line demo: one request with its raw workflow rows.
  approvalUser: {
    Email: "string",
    FullNameEN: "string",
    JobTitle: "string",
    PersonId: "string",
    UserId: "string",
  },
  approvalRes: {
    data: {
      type: "object",
      collection: {
        _id: "string",
        title: "string",
        status: "string",
        requester: { type: "object", collection: { FullNameEN: "string", JobTitle: "string", PersonId: "string" } },
        steps: {
          type: "array",
          collection: {
            Id: "number",
            Sequence: "number",
            Status: "string",
            Remark: "string",
            IsRevised: "boolean",
            ReviewerUser: "any",
            ApproverUser: "any",
            Model: { type: "object", collection: { CreatedAt: "string", UpdatedAt: "string" } },
          },
        },
      },
    },
    status: "number",
    success: "boolean",
    message: "string",
  },
  approvalListRes: {
    data: {
      type: "array",
      collection: { _id: "string", title: "string", status: "string", stepCount: "number" },
    },
    status: "number",
    success: "boolean",
    message: "string",
  },
  approvalParam: {
    id: "string",
  },
  // Workflow editor demo.
  // Replace / Switch Profile demo: the corporate-shaped user profile.
  profileRes: {
    data: {
      type: "object",
      collection: {
        personId: "string",
        userId: "string",
        firstNameEn: "string",
        lastNameEN: "string",
        email: "string",
        jobTitle: "string",
        jobStatus: "string",
        isPrimaryAssignment: "string",
        isAdmin: "boolean",
        avatar: "string",
        companyModel: { type: "object", collection: { code: "string", name: "string" } },
        businessUnitModel: { type: "object", collection: { code: "string", name: "string" } },
      },
    },
    status: "number",
    success: "boolean",
    message: "string",
  },
  profileListRes: {
    data: {
      type: "array",
      collection: {
        personId: "string",
        userId: "string",
        firstNameEn: "string",
        lastNameEN: "string",
        email: "string",
        jobTitle: "string",
        jobStatus: "string",
        isAdmin: "boolean",
        avatar: "string",
        companyModel: { type: "object", collection: { code: "string", name: "string" } },
        businessUnitModel: { type: "object", collection: { code: "string", name: "string" } },
      },
    },
    status: "number",
    success: "boolean",
    message: "string",
  },
  profileEmailQuery: { email: "string" },
  profileSearchQuery: { search: "string" },
  profilePersonParams: { personId: "string" },
  profilePersonQuery: { exceptJobStatus: "string" },
  userRes: {
    data: { type: "array", collection: { PersonId: "string", FullNameEN: "string", JobTitle: "string", Email: "string" } },
    status: "number",
    success: "boolean",
    message: "string",
  },
  userSearchQuery: { search: "string" },
  workflowRes: {
    data: {
      type: "object",
      collection: {
        _id: "string",
        name: "string",
        status: "string",
        businessUnit: "string",
        site: "string",
        steps: {
          type: "array",
          collection: {
            actionType: "string",
            sequence: "number",
            inchargeUsers: { type: "array", collection: { PersonId: "string", FullNameEN: "string", JobTitle: "string" } },
            ccUsers: { type: "array", collection: { PersonId: "string", FullNameEN: "string", JobTitle: "string" } },
          },
        },
      },
    },
    status: "number",
    success: "boolean",
    message: "string",
  },
  workflowBody: {
    name: "string",
    status: "string",
    businessUnit: "string",
    site: "string",
    steps: "any",
  },
  workflowParam: { id: "string" },
  // File collection demo page (`/file-collection`): the nested tree and the
  // fixed mutation bodies (see spec/gummy-file-collection-spec.md §2.3).
  fileCollectionRes: {
    data: {
      type: "array",
      collection: { id: "string", name: "string", directories: "any" },
    },
    status: "number",
    success: "boolean",
    message: "string",
  },
  fileNodeRes: {
    data: {
      type: "object",
      collection: {
        id: "string",
        collectionId: "string",
        parentId: "string",
        name: "string",
        type: "string",
        kind: "string",
        createdAt: "number",
        updatedAt: "number",
      },
    },
    status: "number",
    success: "boolean",
    message: "string",
  },
  nameBody: { name: "string" },
  fileItemCreateBody: { collectionId: "string", parentId: "string", name: "string", type: "string", kind: "string" },
  fileItemMoveBody: { collectionId: "string", parentId: "string" },
};
