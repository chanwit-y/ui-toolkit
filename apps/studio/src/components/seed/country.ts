import type { EndpointDef } from '../Api/types'
import {
  createChildCanvas,
  createDefaultButtonItemConfig,
  createDefaultDataTableConfig,
  createDefaultFormListConfig,
  createDefaultItemSettings,
  createDefaultModalConfig,
  createDefaultRepeaterConfig,
  createDefaultTypographyConfig,
  createDefaultAvatarConfig,
  createDefaultMultiAutocompleteConfig,
  createDefaultAutocompleteConfig,
  createDefaultSelectFieldConfig,
  createDefaultTextConfig,
  createDefaultUploadFileConfig,
  createDefaultTextFieldConfig,
  type GridItemData,
} from '../Layout/types'
import type { ModelDef, ModelField } from '../Model/types'
import type { EnvVarDef } from '../Env/types'
import type { StudioThemeConfig } from '../Theme/types'

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
export const LANGUAGE_RES_MODEL_ID = 'seed-model-language-res'
export const LANGUAGE_BODY_MODEL_ID = 'seed-model-language-body'
export const LANGUAGE_COUNTRY_PARAM_MODEL_ID = 'seed-model-language-country-param'
export const LANGUAGE_PARAM_MODEL_ID = 'seed-model-language-param'
export const CONTACT_RES_MODEL_ID = 'seed-model-contact-res'
export const CONTACT_BODY_MODEL_ID = 'seed-model-contact-body'
export const NOTE_RES_MODEL_ID = 'seed-model-note-res'
export const NOTE_BODY_MODEL_ID = 'seed-model-note-body'
export const ID_PARAM_MODEL_ID = 'seed-model-id-param'
export const REGION_RES_MODEL_ID = 'seed-model-region-res'

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
    ...languageSeedModels(),
    ...formListDemoSeedModels(),
    ...repeaterDemoSeedModels(),
  ]
}

/** The languages sub-resource models (the FormList demo on the detail page). */
export function languageSeedModels(): ModelDef[] {
  return [
    {
      id: LANGUAGE_RES_MODEL_ID,
      name: 'languageRes',
      fields: [
        field('data', 'array', [field('_id'), field('countryId'), field('country'), field('name')], 'object'),
        field('status', 'number'),
        field('success', 'boolean'),
        field('message'),
      ],
    },
    {
      id: LANGUAGE_BODY_MODEL_ID,
      name: 'languageBody',
      fields: [field('country'), field('name')],
    },
    {
      id: LANGUAGE_COUNTRY_PARAM_MODEL_ID,
      name: 'languageCountryParam',
      fields: [field('country')],
    },
    {
      id: LANGUAGE_PARAM_MODEL_ID,
      name: 'languageParam',
      fields: [field('country'), field('id')],
    },
  ]
}

/** The Form list demo page's models: contacts (full CRUD) and notes. */
export function formListDemoSeedModels(): ModelDef[] {
  const envelope = () => [field('status', 'number'), field('success', 'boolean'), field('message')]
  return [
    {
      id: CONTACT_RES_MODEL_ID,
      name: 'contactRes',
      fields: [
        field('data', 'array', [field('_id'), field('name'), field('email'), field('role')], 'object'),
        ...envelope(),
      ],
    },
    {
      id: CONTACT_BODY_MODEL_ID,
      name: 'contactBody',
      fields: [field('name'), field('email'), field('role')],
    },
    {
      id: NOTE_RES_MODEL_ID,
      name: 'noteRes',
      fields: [
        field('data', 'array', [field('_id'), field('text'), field('createdAt')], 'object'),
        ...envelope(),
      ],
    },
    {
      id: NOTE_BODY_MODEL_ID,
      name: 'noteBody',
      fields: [field('text')],
    },
    {
      id: ID_PARAM_MODEL_ID,
      name: 'idParam',
      fields: [field('id')],
    },
  ]
}

/** The Repeater demo's model: regions, each carrying its `countries[]`. */
export function repeaterDemoSeedModels(): ModelDef[] {
  return [
    {
      id: REGION_RES_MODEL_ID,
      name: 'regionRes',
      fields: [
        field(
          'data',
          'array',
          [
            field('_id'),
            field('name'),
            field('description'),
            field('featured', 'boolean'),
            field(
              'countries',
              'array',
              [field('_id'), field('name'), field('code'), field('avatar', 'any')],
              'object',
            ),
          ],
          'object',
        ),
        field('status', 'number'),
        field('success', 'boolean'),
        field('message'),
      ],
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
export const COUNTRY_LANGUAGES_ENDPOINT_ID = 'seed-endpoint-country-languages'
export const CREATE_LANGUAGE_ENDPOINT_ID = 'seed-endpoint-create-language'
export const UPDATE_LANGUAGE_ENDPOINT_ID = 'seed-endpoint-update-language'
export const DELETE_LANGUAGE_ENDPOINT_ID = 'seed-endpoint-delete-language'
export const CONTACTS_ENDPOINT_ID = 'seed-endpoint-contacts'
export const CREATE_CONTACT_ENDPOINT_ID = 'seed-endpoint-create-contact'
export const UPDATE_CONTACT_ENDPOINT_ID = 'seed-endpoint-update-contact'
export const DELETE_CONTACT_ENDPOINT_ID = 'seed-endpoint-delete-contact'
export const NOTES_ENDPOINT_ID = 'seed-endpoint-notes'
export const CREATE_NOTE_ENDPOINT_ID = 'seed-endpoint-create-note'
export const DELETE_NOTE_ENDPOINT_ID = 'seed-endpoint-delete-note'
export const REGIONS_ENDPOINT_ID = 'seed-endpoint-regions'

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
    ...languageSeedEndpoints(),
    ...formListDemoSeedEndpoints(),
    ...repeaterDemoSeedEndpoints(),
  ]
}

/** The languages sub-resource endpoints (`/collection/languages/:country[/:id]`,
 * `:country` = id or code). */
export function languageSeedEndpoints(): EndpointDef[] {
  return [
    {
      id: COUNTRY_LANGUAGES_ENDPOINT_ID,
      name: 'countryLanguages',
      description: 'Languages of a country',
      url: '/collection/languages/:country',
      method: 'GET',
      withOptions: false,
      response: LANGUAGE_RES_MODEL_ID,
      query: null,
      parameter: LANGUAGE_COUNTRY_PARAM_MODEL_ID,
      body: null,
    },
    {
      id: CREATE_LANGUAGE_ENDPOINT_ID,
      name: 'createLanguage',
      description: 'Add a language to a country',
      url: '/collection/languages/:country',
      method: 'POST',
      withOptions: false,
      response: LANGUAGE_RES_MODEL_ID,
      query: null,
      parameter: LANGUAGE_COUNTRY_PARAM_MODEL_ID,
      body: LANGUAGE_BODY_MODEL_ID,
    },
    {
      id: UPDATE_LANGUAGE_ENDPOINT_ID,
      name: 'updateLanguage',
      description: 'Update a language',
      url: '/collection/languages/:country/:id',
      method: 'PATCH',
      withOptions: false,
      response: LANGUAGE_RES_MODEL_ID,
      query: null,
      parameter: LANGUAGE_PARAM_MODEL_ID,
      body: LANGUAGE_BODY_MODEL_ID,
    },
    {
      id: DELETE_LANGUAGE_ENDPOINT_ID,
      name: 'deleteLanguage',
      description: 'Delete a language',
      url: '/collection/languages/:country/:id',
      method: 'DELETE',
      withOptions: false,
      response: LANGUAGE_RES_MODEL_ID,
      query: null,
      parameter: LANGUAGE_PARAM_MODEL_ID,
      body: null,
    },
  ]
}

/** The Form list demo page's endpoints (`/collection/contacts`, `/collection/notes`). */
export function formListDemoSeedEndpoints(): EndpointDef[] {
  const base = { withOptions: false, query: null } as const
  return [
    { ...base, id: CONTACTS_ENDPOINT_ID, name: 'contacts', description: 'List contacts', url: '/collection/contacts', method: 'GET', response: CONTACT_RES_MODEL_ID, parameter: null, body: null },
    { ...base, id: CREATE_CONTACT_ENDPOINT_ID, name: 'createContact', description: 'Create a contact', url: '/collection/contacts', method: 'POST', response: CONTACT_RES_MODEL_ID, parameter: null, body: CONTACT_BODY_MODEL_ID },
    { ...base, id: UPDATE_CONTACT_ENDPOINT_ID, name: 'updateContact', description: 'Update a contact', url: '/collection/contacts/:id', method: 'PATCH', response: CONTACT_RES_MODEL_ID, parameter: ID_PARAM_MODEL_ID, body: CONTACT_BODY_MODEL_ID },
    { ...base, id: DELETE_CONTACT_ENDPOINT_ID, name: 'deleteContact', description: 'Delete a contact', url: '/collection/contacts/:id', method: 'DELETE', response: CONTACT_RES_MODEL_ID, parameter: ID_PARAM_MODEL_ID, body: null },
    { ...base, id: NOTES_ENDPOINT_ID, name: 'notes', description: 'List notes', url: '/collection/notes', method: 'GET', response: NOTE_RES_MODEL_ID, parameter: null, body: null },
    { ...base, id: CREATE_NOTE_ENDPOINT_ID, name: 'createNote', description: 'Create a note', url: '/collection/notes', method: 'POST', response: NOTE_RES_MODEL_ID, parameter: null, body: NOTE_BODY_MODEL_ID },
    { ...base, id: DELETE_NOTE_ENDPOINT_ID, name: 'deleteNote', description: 'Delete a note', url: '/collection/notes/:id', method: 'DELETE', response: NOTE_RES_MODEL_ID, parameter: ID_PARAM_MODEL_ID, body: null },
  ]
}

/** The Repeater demo's endpoint (the mock API's `/collection/regions`). */
export function repeaterDemoSeedEndpoints(): EndpointDef[] {
  return [
    {
      withOptions: false,
      query: null,
      id: REGIONS_ENDPOINT_ID,
      name: 'regions',
      description: 'List regions with their countries',
      url: '/collection/regions',
      method: 'GET',
      response: REGION_RES_MODEL_ID,
      parameter: null,
      body: null,
    },
  ]
}

/* ----------------------------------------------------------- form list */

export const LANGUAGES_ITEM_ID = 'seed-item-detail-languages'

/**
 * The Languages form list on the seeded detail page: two text fields per row
 * (country, name), every CRUD call scoped by `:country` ← the route's `:code`,
 * update/delete keyed by the row's `_id`. Also appended to an existing seeded
 * project by the workspace migration (`migrateV11`).
 */
export function countryLanguagesSeedItem(): GridItemData {
  const country = { type: 'url', key: 'code', source: 'param' } as const
  const id = { type: 'row', key: '_id' } as const
  return {
    id: LANGUAGES_ITEM_ID,
    label: 'Form List',
    type: 'formlist',
    settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 12 } }),
    config: {
      ...createDefaultFormListConfig('countryLanguages'),
      title: 'Languages',
      idKey: '_id',
      addLabel: 'Add new language',
      emptyText: 'No languages yet — add the first one.',
      read: { endpointId: COUNTRY_LANGUAGES_ENDPOINT_ID, params: { country }, extra: {} },
      create: { endpointId: CREATE_LANGUAGE_ENDPOINT_ID, params: { country }, extra: {} },
      update: { endpointId: UPDATE_LANGUAGE_ENDPOINT_ID, params: { country, id }, extra: {} },
      delete: { endpointId: DELETE_LANGUAGE_ENDPOINT_ID, params: { country, id }, extra: {} },
      deleteConfirmTitle: 'Remove language',
      deleteConfirmDescription: 'Remove this language from the country?',
    },
    childCanvases: [
      {
        ...createChildCanvas(),
        items: [
          {
            id: 'seed-item-language-country',
            label: 'Text Field',
            type: 'textfield',
            settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 3, md: 4, lg: 5 } }),
            config: { ...createDefaultTextFieldConfig('country'), label: 'Country' },
          },
          {
            id: 'seed-item-language-name',
            label: 'Text Field',
            type: 'textfield',
            settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 3, md: 4, lg: 7 } }),
            config: {
              ...createDefaultTextFieldConfig('name'),
              label: 'Name',
              isRequired: true,
              errorMessage: 'Name is required',
            },
          },
        ],
      },
    ],
  }
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

/* ----------------------------------------------------------------- theme */

/**
 * The example app's theme (`config/theme.ts`): teal accent + button, dataTable
 * header font tweaks, teal edit / red delete. The header/hover/pagination/
 * row-hover roles stay unset so they follow the accent and dark-flip (pinning
 * them routes into the legacy light-only map — the Theme page warns).
 */
export function countrySeedTheme(): StudioThemeConfig {
  return {
    appearance: 'light',
    accentColor: 'teal',
    radius: 'small',
    panelBackground: 'translucent',
    buttonColor: 'teal',
    dataTable: {
      headerColor: '',
      headerTextColor: '',
      headerFontSize: 'sm',
      headerFontWeight: 'semibold',
      headerHoverColor: '',
      paginationButtonColor: '',
      paginationButtonHoverColor: '',
      rowHoverColor: '',
      editButtonColor: 'teal',
      deleteButtonColor: 'red',
    },
  }
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

  // The wired Save button (see the grilled button design): confirm-first, the
  // canonical submit sequence, createCountry as the endpoint, reload the
  // countries table, success + $exception snackbars — the same shape as the
  // example app's Create button, so the Live Preview exercises the whole
  // create → reload → snackbar path against the mock API.
  const saveButton: GridItemData = {
    id: 'seed-item-save-country',
    label: 'Button',
    type: 'button',
    settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 3, md: 3, lg: 4 } }),
    config: {
      ...createDefaultButtonItemConfig(),
      label: 'Save',
      icon: 'save',
      mode: 'confirm',
      confirmTitle: 'Create Country',
      confirmDescription: 'Are you sure you want to create this country?',
      confirmTrue: ['StartLoading', 'SubmitFormToPostAPI', 'StopLoading', 'CloseModal'],
      modalItemId: 'seed-item-country-modal',
      reloadTableItemId: 'seed-item-table',
      endpointId: CREATE_COUNTRY_ENDPOINT_ID,
      snackbarSuccessEnabled: true,
      snackbarSuccessMessage: 'Country created successfully',
      snackbarErrorException: true,
    },
  }

  // The edit modal's contents (the table's child canvas → engine
  // `modalContainer`): the same bound country form plus a confirm-first Update
  // button on `updateCountry` (PATCH), mirroring the example app's edit flow.
  // Fresh ids — these cells coexist with the Add Country modal's copies.
  const editNameField: GridItemData = {
    ...nameField,
    id: 'seed-item-edit-name',
  }
  const editCodeField: GridItemData = {
    ...codeField,
    id: 'seed-item-edit-code',
  }
  const updateButton: GridItemData = {
    id: 'seed-item-update-country',
    label: 'Button',
    type: 'button',
    settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 3, md: 3, lg: 4 } }),
    config: {
      ...createDefaultButtonItemConfig(),
      label: 'Update',
      icon: 'save',
      mode: 'confirm',
      confirmTitle: 'Update Country',
      confirmDescription: 'Are you sure you want to update this country?',
      confirmTrue: ['StartLoading', 'SubmitFormToPatchAPI', 'StopLoading', 'CloseModal'],
      // No modal target: the engine's CloseModal always closes the table's own
      // edit modal (the hardcoded "modalEdit" fn ctx).
      reloadTableItemId: 'seed-item-table',
      endpointId: UPDATE_COUNTRY_ENDPOINT_ID,
      snackbarSuccessEnabled: true,
      snackbarSuccessMessage: 'Country updated successfully',
      snackbarErrorException: true,
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
      childCanvases: [
        { ...createChildCanvas(), items: [nameField, codeField, saveButton] },
      ],
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
        modalMaxWidth: '800px',
        modalMinWidth: '700px',
        // The example app's apiDeleteInfo (config/country/container.ts), authored
        // through the panel's delete section instead of hand-wired.
        deleteEndpointId: DELETE_COUNTRY_ENDPOINT_ID,
        deleteParams: { id: '_id' },
        // Row click → the detail page, `:code` read off the clicked row (the
        // engine's rowNavigate; see the grilled page-router design).
        rowNavigate: {
          pageId: 'seed-page-country-detail',
          params: { code: { type: 'row', key: 'code' } },
          replace: false,
        },
        deleteConfirmTitle: 'Delete Country',
        deleteConfirmDescription: 'Are you sure you want to delete this country?',
        deleteSnackbarSuccessEnabled: true,
        deleteSnackbarSuccessMessage: 'Country deleted successfully',
        deleteSnackbarErrorException: true,
        columns: [
          {
            id: 'seed-col-code',
            accessor: 'code',
            header: 'Code',
            enableSorting: true,
            enableColumnFilter: false,
            align: 'center',
            useDateFormat: '',
          },
          {
            id: 'seed-col-name',
            accessor: 'name',
            header: 'Name',
            enableSorting: true,
            enableColumnFilter: false,
            align: 'start',
            useDateFormat: '',
          },
          {
            id: 'seed-col-updated-at',
            accessor: 'updated_at',
            header: 'Updated',
            enableSorting: true,
            enableColumnFilter: false,
            align: 'center',
            useDateFormat: 'DD/MM/YYYY',
          },
          {
            id: 'seed-col-updated-by',
            accessor: 'updated_by_name',
            header: 'Updated by',
            enableSorting: false,
            enableColumnFilter: false,
            align: 'center',
            useDateFormat: '',
          },
        ],
      },
      childCanvases: [
        { ...createChildCanvas(), items: [editNameField, editCodeField, updateButton] },
      ],
    },
  ]
}

/**
 * The "Option display" example page (see the grilled option-display design): the
 * three select-family fields with their icon / title / subtitle / image already
 * configured, so the Props panel's "Option display" section and the Live Preview
 * dropdowns have something to show.
 *
 * - `status` is static: title `name`, subtitle `note`, one option icon.
 * - `countryId` / `neighbourIds` read `searchCountries` rows: title `name`,
 *   subtitle `code`, image `avatar` (the flag). Their static starter record
 *   mirrors the row shape only so the canvas cell can draw a chip — source mode
 *   exports `options: []`.
 */
export function optionDisplaySeedItems(): GridItemData[] {
  const countryRow = {
    _id: '1',
    name: 'Thailand',
    code: 'TH',
    avatar: 'https://flagcdn.com/w40/th.png',
  }
  const countrySource = {
    mode: 'source' as const,
    options: [countryRow],
    dataSource: { endpointId: SEARCH_COUNTRIES_ENDPOINT_ID, paths: 'data' },
    idKey: '_id',
    displayKey: 'name',
    searchKey: 'name',
    subtitleKey: 'code',
    avatarKey: 'avatar',
  }
  return [
    {
      id: 'seed-item-options-heading',
      label: 'Text',
      type: 'text',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 12 } }),
      config: {
        ...createDefaultTextConfig(),
        text: 'Option display — select a field, then Props → Option display. Preview shows the real dropdowns.',
      },
    },
    {
      id: 'seed-item-options-status',
      label: 'Select',
      type: 'select',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 4, lg: 4 } }),
      config: {
        ...createDefaultSelectFieldConfig('status'),
        label: 'Status',
        placeholder: 'Choose a status',
        options: [
          { id: 'draft', name: 'Draft', note: 'Only you can see it' },
          { id: 'review', name: 'In review', note: 'Waiting for an approver' },
          { id: 'published', name: 'Published', note: 'Live for everyone' },
        ],
        subtitleKey: 'note',
        inputIcon: 'flag',
        itemIcon: 'checkCircle',
      },
    },
    {
      id: 'seed-item-options-country',
      label: 'Autocomplete',
      type: 'autocomplete',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 4, lg: 4 } }),
      config: {
        ...createDefaultAutocompleteConfig('countryId'),
        ...countrySource,
        label: 'Country',
        placeholder: 'Search a country…',
        inputIcon: 'globe',
        // Shown only on rows without a flag — the image wins.
        itemIcon: 'mapPin',
      },
    },
    {
      id: 'seed-item-options-neighbours',
      label: 'Multi Autocomplete',
      type: 'multiAutocomplete',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 4 } }),
      config: {
        ...createDefaultMultiAutocompleteConfig('neighbourIds'),
        ...countrySource,
        label: 'Neighbouring countries',
        placeholder: 'Choose countries…',
        helperText: 'Pick up to five',
        inputIcon: 'compass',
        maxSelections: 5,
      },
    },
  ]
}

/**
 * The "Icons" example page: the two icon slots on their own, without an image
 * field, so what each one does is easy to see in the Props panel and the Live
 * Preview — `itemIcon` is one glyph on every row, `inputIcon` sits in the
 * trigger. All static so the page works without the API.
 */
export function iconDemoSeedItems(): GridItemData[] {
  return [
    {
      id: 'seed-item-icons-heading',
      label: 'Text',
      type: 'text',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 12 } }),
      config: {
        ...createDefaultTextConfig(),
        text: 'Icons — Option icon draws one glyph on every row, Input icon sits in the trigger. Select a field, then Props → Option display.',
      },
    },
    {
      // Option icon only: the trigger keeps the default search glyph.
      id: 'seed-item-icons-priority',
      label: 'Select',
      type: 'select',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 4, lg: 4 } }),
      config: {
        ...createDefaultSelectFieldConfig('priority'),
        label: 'Priority',
        placeholder: 'Option icon only',
        options: [
          { id: 'low', name: 'Low' },
          { id: 'medium', name: 'Medium' },
          { id: 'high', name: 'High' },
          { id: 'urgent', name: 'Urgent' },
        ],
        itemIcon: 'alertTriangle',
      },
    },
    {
      // Input icon only: plain rows, a glyph in the trigger.
      id: 'seed-item-icons-category',
      label: 'Autocomplete',
      type: 'autocomplete',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 4, lg: 4 } }),
      config: {
        ...createDefaultAutocompleteConfig('category'),
        mode: 'static',
        label: 'Category',
        placeholder: 'Input icon only',
        options: [
          { id: 'bug', name: 'Bug' },
          { id: 'feature', name: 'Feature' },
          { id: 'chore', name: 'Chore' },
          { id: 'docs', name: 'Documentation' },
        ],
        inputIcon: 'tag',
      },
    },
    {
      // Both icons plus a subtitle, on a multi.
      id: 'seed-item-icons-tags',
      label: 'Multi Autocomplete',
      type: 'multiAutocomplete',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 4 } }),
      config: {
        ...createDefaultMultiAutocompleteConfig('tags'),
        mode: 'static',
        label: 'Tags',
        placeholder: 'Both icons + subtitle',
        options: [
          { id: 'frontend', name: 'Frontend', note: 'React, CSS' },
          { id: 'backend', name: 'Backend', note: 'API, database' },
          { id: 'design', name: 'Design', note: 'Figma, tokens' },
          { id: 'infra', name: 'Infra', note: 'CI, hosting' },
        ],
        subtitleKey: 'note',
        itemIcon: 'hash',
        inputIcon: 'bookmark',
        maxSelections: 3,
      },
    },
  ]
}

export const FORM_LIST_PAGE_ID = 'seed-page-form-list'

/**
 * The "Form list" demo page's items (the example app's `/form-list`): a
 * full-CRUD contacts list — name, email and a static-options role select per
 * row — and a create-and-delete-only notes list that starts empty. Used by
 * the fresh seed and appended to an existing seeded project by `migrateV12`.
 */
export function formListDemoSeedItems(): GridItemData[] {
  const rowId = { type: 'row', key: '_id' } as const
  const ref = (endpointId: string, params: Record<string, typeof rowId> = {}) => ({
    endpointId,
    params,
    extra: {},
  })
  const full = { xs: 4, sm: 6, md: 8, lg: 12 }
  return [
    {
      id: 'seed-item-form-list-heading',
      label: 'Text',
      type: 'text',
      settings: createDefaultItemSettings({ colSpan: full }),
      config: {
        ...createDefaultTextConfig(),
        text: 'Form list — each row is its own form. Contacts is full CRUD; Notes has no update API (saved rows are read-only) and starts empty.',
      },
    },
    {
      id: 'seed-item-form-list-contacts',
      label: 'Form List',
      type: 'formlist',
      settings: createDefaultItemSettings({ colSpan: full }),
      config: {
        ...createDefaultFormListConfig('contacts'),
        title: 'Contacts',
        idKey: '_id',
        addLabel: 'Add contact',
        emptyText: 'No contacts yet.',
        read: ref(CONTACTS_ENDPOINT_ID),
        create: ref(CREATE_CONTACT_ENDPOINT_ID),
        update: ref(UPDATE_CONTACT_ENDPOINT_ID, { id: rowId }),
        delete: ref(DELETE_CONTACT_ENDPOINT_ID, { id: rowId }),
        deleteConfirmTitle: 'Delete contact',
        deleteConfirmDescription: 'Remove this contact from the list?',
      },
      childCanvases: [
        {
          ...createChildCanvas(),
          items: [
            {
              id: 'seed-item-contact-name',
              label: 'Text Field',
              type: 'textfield',
              settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 3, md: 4, lg: 4 } }),
              config: {
                ...createDefaultTextFieldConfig('name'),
                label: 'Name',
                isRequired: true,
                errorMessage: 'Name is required',
              },
            },
            {
              id: 'seed-item-contact-email',
              label: 'Text Field',
              type: 'textfield',
              settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 3, md: 4, lg: 4 } }),
              config: {
                ...createDefaultTextFieldConfig('email'),
                label: 'Email',
                dataType: 'email',
                placeholder: 'name@example.com',
              },
            },
            {
              id: 'seed-item-contact-role',
              label: 'Select',
              type: 'select',
              settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 4, lg: 4 } }),
              config: {
                ...createDefaultSelectFieldConfig('role'),
                label: 'Role',
                placeholder: 'Pick a role',
                isRequired: true,
                errorMessage: 'Pick a role',
                options: [
                  { id: 'admin', name: 'Admin' },
                  { id: 'editor', name: 'Editor' },
                  { id: 'viewer', name: 'Viewer' },
                ],
                inputIcon: 'user',
              },
            },
          ],
        },
      ],
    },
    {
      id: 'seed-item-form-list-notes',
      label: 'Form List',
      type: 'formlist',
      settings: createDefaultItemSettings({ colSpan: full }),
      config: {
        ...createDefaultFormListConfig('notes'),
        title: 'Notes',
        idKey: '_id',
        canUpdate: false,
        // Chrome placement: Add above the rows on the right, Delete below each row.
        addLabel: 'Add note',
        addPosition: 'top',
        addAlign: 'end',
        removeLabel: 'Delete',
        removeIcon: 'xCircle',
        removePosition: 'below',
        removeDisplay: 'icon',
        emptyText: 'Nothing here yet — add the first note.',
        read: ref(NOTES_ENDPOINT_ID),
        create: ref(CREATE_NOTE_ENDPOINT_ID),
        delete: ref(DELETE_NOTE_ENDPOINT_ID, { id: rowId }),
        deleteConfirmTitle: 'Delete note',
        deleteConfirmDescription: 'Delete this note?',
      },
      childCanvases: [
        {
          ...createChildCanvas(),
          items: [
            {
              id: 'seed-item-note-text',
              label: 'Text Field',
              type: 'textfield',
              settings: createDefaultItemSettings({ colSpan: full }),
              config: {
                ...createDefaultTextFieldConfig('text'),
                label: 'Note',
                isRequired: true,
                errorMessage: 'Write something first',
                placeholder: 'What should the team remember?',
              },
            },
          ],
        },
      ],
    },
  ]
}

/* ------------------------------------------------------------ repeater */

export const REPEATER_PAGE_ID = 'seed-page-repeater'

/**
 * The "Repeater" demo page's items (the example app's `/repeater`): a country
 * card grid over the `countries` endpoint — avatar / name / code bound to the
 * item, the whole card linking to the detail page — and a regions list whose
 * items host a nested repeater over the parent item's `countries` field, each
 * inner row with its own Navigate button. Used by the fresh seed and appended
 * to an existing seeded project by `migrateV15`.
 */
export function repeaterDemoSeedItems(): GridItemData[] {
  const full = { xs: 4, sm: 6, md: 8, lg: 12 }
  const span = (lg: number) => ({
    xs: Math.max(1, Math.round((lg / 12) * 4)),
    sm: Math.max(1, Math.round((lg / 12) * 6)),
    md: Math.max(1, Math.round((lg / 12) * 8)),
    lg,
  })
  const bind = (key: string) => ({ key, path: '' })
  const toDetail = {
    pageId: 'seed-page-country-detail',
    params: { code: { type: 'row', key: 'code' } as const },
    replace: false,
  }
  const flag = (id: string, lg: number, size: 'sm' | 'lg'): GridItemData => ({
    id,
    label: 'Avatar',
    type: 'avatar',
    settings: createDefaultItemSettings({ colSpan: span(lg) }),
    config: {
      ...createDefaultAvatarConfig('flag'),
      size,
      fallback: '?',
      srcBinding: bind('avatar'),
      fallbackBinding: bind('code'),
    },
  })
  return [
    {
      id: 'seed-item-repeater-heading',
      label: 'Text',
      type: 'text',
      settings: createDefaultItemSettings({ colSpan: full }),
      config: {
        ...createDefaultTextConfig(),
        text: 'Repeater — one item template rendered per API row; the components inside bind to the current item.',
      },
    },
    {
      id: 'seed-item-repeater-countries',
      label: 'Repeater',
      type: 'repeater',
      settings: createDefaultItemSettings({ colSpan: full }),
      config: {
        ...createDefaultRepeaterConfig('countryCards'),
        title: 'Country cards',
        idKey: '_id',
        read: { endpointId: COUNTRIES_ENDPOINT_ID, params: {}, extra: {} },
        itemSpan: { xs: 12, sm: 6, md: 4, lg: 3 },
        itemSurface: 'outlined',
        itemPadding: '3',
        emptyText: 'No countries yet',
        itemNavigate: toDetail,
      },
      childCanvases: [
        {
          ...createChildCanvas(),
          items: [
            flag('seed-item-repeater-country-flag', 3, 'lg'),
            {
              id: 'seed-item-repeater-country-name',
              label: 'Typography',
              type: 'typography',
              settings: createDefaultItemSettings({ colSpan: span(6) }),
              config: {
                ...createDefaultTypographyConfig(),
                text: 'Unnamed country',
                variant: 'subtitle1',
                weight: 'medium',
                truncate: true,
                binding: bind('name'),
              },
            },
            {
              id: 'seed-item-repeater-country-code',
              label: 'Typography',
              type: 'typography',
              settings: createDefaultItemSettings({ colSpan: span(3) }),
              config: {
                ...createDefaultTypographyConfig(),
                text: '—',
                variant: 'caption',
                color: 'gray',
                align: 'right',
                binding: bind('code'),
              },
            },
          ],
        },
      ],
    },
    {
      id: 'seed-item-repeater-regions',
      label: 'Repeater',
      type: 'repeater',
      settings: createDefaultItemSettings({ colSpan: full }),
      config: {
        ...createDefaultRepeaterConfig('regions'),
        title: 'Regions (nested repeater)',
        idKey: '_id',
        read: { endpointId: REGIONS_ENDPOINT_ID, params: {}, extra: {} },
        itemSpan: { xs: 12, sm: 12, md: 6, lg: 6 },
        itemSurface: 'elevation',
        emptyText: 'No regions',
      },
      childCanvases: [
        {
          ...createChildCanvas(),
          items: [
            {
              id: 'seed-item-repeater-region-name',
              label: 'Typography',
              type: 'typography',
              settings: createDefaultItemSettings({ colSpan: full }),
              config: { ...createDefaultTypographyConfig(), text: 'Region', variant: 'h6', binding: bind('name') },
            },
            {
              id: 'seed-item-repeater-region-description',
              label: 'Typography',
              type: 'typography',
              settings: createDefaultItemSettings({ colSpan: full }),
              config: {
                ...createDefaultTypographyConfig(),
                text: '',
                variant: 'body2',
                color: 'gray',
                binding: bind('description'),
              },
            },
            {
              id: 'seed-item-repeater-region-countries',
              label: 'Repeater',
              type: 'repeater',
              settings: createDefaultItemSettings({ colSpan: full }),
              config: {
                ...createDefaultRepeaterConfig('regionCountries'),
                idKey: '_id',
                // The array is already in scope: a field of the region item.
                source: 'parent',
                parentField: 'countries',
                gap: '2',
                emptyText: 'No countries in this region',
              },
              childCanvases: [
                {
                  ...createChildCanvas(),
                  items: [
                    flag('seed-item-repeater-region-country-flag', 2, 'sm'),
                    {
                      id: 'seed-item-repeater-region-country-name',
                      label: 'Typography',
                      type: 'typography',
                      settings: createDefaultItemSettings({ colSpan: span(6) }),
                      config: {
                        ...createDefaultTypographyConfig(),
                        text: '',
                        variant: 'body2',
                        truncate: true,
                        binding: bind('name'),
                      },
                    },
                    {
                      id: 'seed-item-repeater-region-country-open',
                      label: 'Button',
                      type: 'button',
                      settings: createDefaultItemSettings({ colSpan: span(4) }),
                      config: {
                        ...createDefaultButtonItemConfig(),
                        label: 'Open',
                        icon: 'chevronRight',
                        actions: ['Navigate'],
                        navigate: toDetail,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
}

export const UPLOAD_PAGE_ID = 'seed-page-upload'

/**
 * The "Upload" example page (the example app's `/file-upload`): the file upload's
 * mode, accepted types and preview, one config per field so each is easy to
 * find in the Props panel. The canvas cells show stand-in files; picking real
 * ones — and the viewer — is exercised in the Live Preview. "Media via API"
 * posts to the mock API's `/upload/single`.
 */
export function uploadDemoSeedItems(): GridItemData[] {
  const half = createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 4, lg: 6 } })
  return [
    {
      id: 'seed-item-upload-heading',
      label: 'Text',
      type: 'text',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 12 } }),
      config: {
        ...createDefaultTextConfig(),
        text: 'Upload — mode, accepted types and preview. Select a field, then Props → Mode / Accepted types / Preview.',
      },
    },
    {
      // Single mode: the file replaces the dropzone and carries Replace / Remove.
      id: 'seed-item-upload-single',
      label: 'Upload File',
      type: 'uploadfile',
      settings: half,
      config: {
        ...createDefaultUploadFileConfig('contract'),
        label: 'Signed contract',
        helperText: 'Single file, PDF only, max 5 MB',
        acceptPresets: ['pdf'],
        maxSizeMB: 5,
      },
    },
    {
      // Presets + extra raw extensions; a mixed batch is accepted partially.
      id: 'seed-item-upload-project',
      label: 'Upload File',
      type: 'uploadfile',
      settings: half,
      config: {
        ...createDefaultUploadFileConfig('projectFiles'),
        label: 'Project files',
        helperText: 'Presets mixed with extra types — files that do not fit are skipped and named',
        multiple: true,
        maxFiles: 4,
        maxSizeMB: 10,
        acceptPresets: ['document', 'spreadsheet', 'presentation', 'archive'],
        accept: '.dwg,.psd',
      },
    },
    {
      // Grid preview: square cards, click for the viewer.
      id: 'seed-item-upload-gallery',
      label: 'Upload File',
      type: 'uploadfile',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 12 } }),
      config: {
        ...createDefaultUploadFileConfig('gallery'),
        label: 'Photo gallery',
        helperText: 'Grid preview — click a card for the viewer, ← / → to step through',
        multiple: true,
        maxFiles: 8,
        acceptPresets: ['image'],
        previewLayout: 'grid',
      },
    },
    {
      // API mode: the value holds URLs, which the viewer opens directly.
      id: 'seed-item-upload-media',
      label: 'Upload File',
      type: 'uploadfile',
      settings: half,
      config: {
        ...createDefaultUploadFileConfig('media'),
        label: 'Media via API',
        helperText: 'Uploaded to the API — PDF, audio, video and text open in the viewer',
        multiple: true,
        maxFiles: 3,
        acceptPresets: ['image', 'pdf', 'text', 'audio', 'video'],
        valueFormat: 'api',
        api: {
          uploadUrl: '/upload/single',
          deleteUrl: '/upload/:filename',
          fieldName: 'file',
          responsePath: 'data.url',
        },
      },
    },
    {
      // Preview off: plain rows, no thumbnails, no viewer.
      id: 'seed-item-upload-plain',
      label: 'Upload File',
      type: 'uploadfile',
      settings: half,
      config: {
        ...createDefaultUploadFileConfig('plainFiles'),
        label: 'Preview off',
        helperText: 'Plain rows — no thumbnails, no viewer',
        multiple: true,
        preview: false,
      },
    },
  ]
}
