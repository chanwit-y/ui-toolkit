import type { EndpointDef } from '../Api/types'
import {
  createChildCanvas,
  createDefaultDataTableConfig,
  createDefaultItemSettings,
  createDefaultModalConfig,
  createDefaultTextFieldConfig,
  type GridItemData,
} from '../Layout/types'
import type { ModelDef, ModelField } from '../Model/types'
import type { EnvVarDef } from '../Env/types'

/**
 * The mock "country" config studio boots with — the same feature the example
 * app ships (`apps/example/src/config/country/`) and the mock API serves
 * (`apps/api`, port 9000), so every page opens populated and the Live Preview
 * fetches real rows out of the box. One module seeds all four stores so the
 * cross-store refs (endpoint → model, grid item → endpoint) share ids.
 *
 * Ids are fixed strings (not UUIDs): the stores import these constants, and
 * deterministic ids make the seeded state debuggable. Runtime-created rows
 * keep using `crypto.randomUUID()`.
 */

/* ---------------------------------------------------------------- models */

let fieldSeq = 0
/** A seeded model field (ids unique via a module-local counter). */
function field(
  name: string,
  kind: ModelField['kind'] = 'string',
  children: ModelField[] = [],
  arrayOf: ModelField['arrayOf'] = children.length ? 'object' : 'string',
): ModelField {
  return { id: `seed-field-${++fieldSeq}`, name, kind, children, arrayOf }
}

/** The country row shape shared by every response model. */
function countryRowFields(): ModelField[] {
  return [
    field('_id'),
    field('name'),
    field('code'),
    field('avatar', 'any'),
    field('updated_at'),
    field('updated_by_name'),
  ]
}

export const COUNTRY_RES_MODEL_ID = 'seed-model-country-res'
export const COUNTRY_PAGED_RES_MODEL_ID = 'seed-model-country-paged-res'
export const COUNTRY_DETAIL_RES_MODEL_ID = 'seed-model-country-detail-res'
export const COUNTRY_PAGE_BODY_MODEL_ID = 'seed-model-country-page-body'
export const COUNTRY_BODY_MODEL_ID = 'seed-model-country-body'
export const COUNTRY_PARAM_MODEL_ID = 'seed-model-country-param'
export const COUNTRY_SEARCH_QUERY_MODEL_ID = 'seed-model-country-search-query'

/** The example app's country models (`config/country/model.ts`), as editor trees. */
export function countrySeedModels(): ModelDef[] {
  return [
    {
      id: COUNTRY_RES_MODEL_ID,
      name: 'countryRes',
      fields: [
        field('data', 'array', countryRowFields(), 'object'),
        field('status', 'number'),
        field('success', 'boolean'),
        field('message'),
      ],
    },
    {
      id: COUNTRY_PAGED_RES_MODEL_ID,
      name: 'countryPagedRes',
      fields: [
        field('data', 'array', countryRowFields(), 'object'),
        field('total', 'number'),
        field('status', 'number'),
        field('success', 'boolean'),
        field('message'),
      ],
    },
    {
      id: COUNTRY_DETAIL_RES_MODEL_ID,
      name: 'countryDetailRes',
      fields: [
        field('data', 'object', countryRowFields()),
        field('status', 'number'),
        field('success', 'boolean'),
        field('message'),
      ],
    },
    {
      id: COUNTRY_PAGE_BODY_MODEL_ID,
      name: 'countryPageBody',
      fields: [field('offset', 'number'), field('limit', 'number'), field('search')],
    },
    {
      id: COUNTRY_BODY_MODEL_ID,
      name: 'countryBody',
      fields: [
        field('name'),
        field('code'),
        field('flagImage'),
        field(
          'documents',
          'array',
          [field('name'), field('size', 'number'), field('type'), field('data')],
          'object',
        ),
      ],
    },
    {
      id: COUNTRY_PARAM_MODEL_ID,
      name: 'countryParam',
      fields: [field('id')],
    },
    {
      id: COUNTRY_SEARCH_QUERY_MODEL_ID,
      name: 'countrySearchQuery',
      fields: [field('search')],
    },
  ]
}

/* ------------------------------------------------------------- endpoints */

export const SEARCH_COUNTRIES_ENDPOINT_ID = 'seed-endpoint-search-countries'
export const COUNTRIES_ENDPOINT_ID = 'seed-endpoint-countries'
export const COUNTRIES_PAGED_ENDPOINT_ID = 'seed-endpoint-countries-paged'
export const COUNTRY_DETAIL_ENDPOINT_ID = 'seed-endpoint-country-detail'
export const CREATE_COUNTRY_ENDPOINT_ID = 'seed-endpoint-create-country'
export const UPDATE_COUNTRY_ENDPOINT_ID = 'seed-endpoint-update-country'
export const DELETE_COUNTRY_ENDPOINT_ID = 'seed-endpoint-delete-country'

/** The example app's country endpoints (`config/country/api.ts`). */
export function countrySeedEndpoints(): EndpointDef[] {
  return [
    {
      id: SEARCH_COUNTRIES_ENDPOINT_ID,
      name: 'searchCountries',
      description: 'Search countries by name or code',
      url: '/collection/search',
      method: 'GET',
      withOptions: false,
      response: COUNTRY_RES_MODEL_ID,
      query: COUNTRY_SEARCH_QUERY_MODEL_ID,
      parameter: null,
      body: null,
    },
    {
      id: COUNTRIES_ENDPOINT_ID,
      name: 'countries',
      description: 'Get all countries',
      url: '/collection/get-all',
      method: 'POST',
      withOptions: false,
      response: COUNTRY_RES_MODEL_ID,
      query: null,
      parameter: null,
      body: COUNTRY_PAGE_BODY_MODEL_ID,
    },
    {
      id: COUNTRIES_PAGED_ENDPOINT_ID,
      name: 'countriesPaged',
      description: 'Get a page of countries (server-side pagination + search)',
      url: '/collection/page',
      method: 'POST',
      withOptions: false,
      response: COUNTRY_PAGED_RES_MODEL_ID,
      query: null,
      parameter: null,
      body: COUNTRY_PAGE_BODY_MODEL_ID,
    },
    {
      id: COUNTRY_DETAIL_ENDPOINT_ID,
      name: 'countryDetail',
      description: 'Get a single country by id',
      url: '/collection/detail/:id',
      method: 'GET',
      withOptions: false,
      response: COUNTRY_DETAIL_RES_MODEL_ID,
      query: null,
      parameter: COUNTRY_PARAM_MODEL_ID,
      body: null,
    },
    {
      id: CREATE_COUNTRY_ENDPOINT_ID,
      name: 'createCountry',
      description: 'Create country',
      url: '/collection/create/691e9963992636eb1560eadb',
      method: 'POST',
      withOptions: false,
      response: COUNTRY_RES_MODEL_ID,
      query: null,
      parameter: null,
      body: COUNTRY_BODY_MODEL_ID,
    },
    {
      id: UPDATE_COUNTRY_ENDPOINT_ID,
      name: 'updateCountry',
      description: 'Update country',
      url: '/collection/update/691e9963992636eb1560eadb/:id',
      method: 'PATCH',
      withOptions: false,
      response: COUNTRY_RES_MODEL_ID,
      query: null,
      parameter: COUNTRY_PARAM_MODEL_ID,
      body: COUNTRY_BODY_MODEL_ID,
    },
    {
      id: DELETE_COUNTRY_ENDPOINT_ID,
      name: 'deleteCountry',
      description: 'Delete country',
      url: '/collection/delete/691e9963992636eb1560eadb/:id',
      method: 'DELETE',
      withOptions: false,
      response: COUNTRY_RES_MODEL_ID,
      query: null,
      parameter: COUNTRY_PARAM_MODEL_ID,
      body: null,
    },
  ]
}

/* ------------------------------------------------------------------- env */

/** API_URL preset to the mock API (`apps/api`), so the Live Preview fetches
 * real countries with zero setup when it's running (`bun run api`). */
export function countrySeedEnvVars(): EnvVarDef[] {
  return [
    {
      id: 'seed-env-api-url',
      name: 'API_URL',
      value: 'http://localhost:9000',
      locked: true,
    },
  ]
}

/* ------------------------------------------------------------------ grid */

/**
 * The starter canvas: an "Add Country" modal whose child canvas carries the
 * bound country form (name + code — the same binding keys `countryBody`
 * expects), above a data table wired to `searchCountries` — enough to demo the
 * whole pipeline, including drill-in (Edit contents on the modal cell) and the
 * engine actually opening the modal in the Live Preview.
 */
export function countrySeedGridItems(): GridItemData[] {
  // `errorMessage` stays empty in the seeds: the canvas preview renders a
  // non-empty message as an active error (red field), which would make the
  // form look broken before anyone typed. Authors fill it in the inspector.
  const nameField: GridItemData = {
    id: 'seed-item-name',
    label: 'Text Field',
    type: 'textfield',
    settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 12 } }),
    config: {
      ...createDefaultTextFieldConfig('name'),
      label: 'Name',
      placeholder: 'Country name',
      isRequired: true,
    },
  }
  const codeField: GridItemData = {
    id: 'seed-item-code',
    label: 'Text Field',
    type: 'textfield',
    settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 4, lg: 6 } }),
    config: {
      ...createDefaultTextFieldConfig('code'),
      label: 'Code',
      placeholder: 'TH',
      isRequired: true,
    },
  }

  return [
    {
      id: 'seed-item-country-modal',
      label: 'Modal',
      type: 'modal',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 3, md: 2, lg: 2 } }),
      config: {
        ...createDefaultModalConfig('countryModal'),
        title: 'Country',
        description: 'Create or edit a country',
        maxWidth: '520px',
        trigger: { label: 'Add Country', icon: 'puls' },
      },
      childCanvases: [{ ...createChildCanvas(), items: [nameField, codeField] }],
    },
    {
      id: 'seed-item-table',
      label: 'Data Table',
      type: 'datatable',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 12 } }),
      config: {
        ...createDefaultDataTableConfig('dtCountry'),
        title: 'Countries',
        endpointId: SEARCH_COUNTRIES_ENDPOINT_ID,
        apiPaths: 'data',
        columns: [
          {
            accessor: 'code',
            header: 'Code',
            enableSorting: true,
            enableColumnFilter: false,
            align: 'center',
            useDateFormat: '',
          },
          {
            accessor: 'name',
            header: 'Name',
            enableSorting: true,
            enableColumnFilter: false,
            align: 'start',
            useDateFormat: '',
          },
          {
            accessor: 'updated_at',
            header: 'Updated',
            enableSorting: true,
            enableColumnFilter: false,
            align: 'center',
            useDateFormat: 'DD/MM/YYYY',
          },
          {
            accessor: 'updated_by_name',
            header: 'Updated by',
            enableSorting: false,
            enableColumnFilter: false,
            align: 'center',
            useDateFormat: '',
          },
        ],
      },
    },
  ]
}
