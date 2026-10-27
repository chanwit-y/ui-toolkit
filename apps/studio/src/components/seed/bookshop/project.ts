import type { EnvVarDef } from '../../Env/types'
import { createDefaultBackdrop, type StudioThemeConfig } from '../../Theme/types'
import { createAuthDef, type AuthDef } from '../../Workspace/auth'
import type { CustomActionDef } from '../../Workspace/customActions'
import type { CustomComponentDef } from '../../Workspace/customComponents'
import { projectFolders, projectKey, type ProjectFolder } from '../../Workspace/runtimeProject'
import { defaultShell } from '../../Workspace/snapshots'
import type { LibraryData, MenuItemDef, ProjectDef, ShellSettings, TemplateDef, WorkspaceData } from '../../Workspace/types'
import { builtinTemplates } from '../templates'
import { bookshopEndpoints, bookshopModels, E } from './library'
import { bookshopPages, P, PRINT_ORDER_ACTION_ID, SALES_CHART_COMPONENT_ID } from './pages'
import { navigate } from './ui'
import { portalProject } from '../portal/project'
import { glassProject } from '../glass/project'

/**
 * The Book shop demo as a studio workspace (see the grilled design
 * `bookshop-demo`): the Book shop project over its own library, signing in
 * through a "Book shop Azure" entry, plus **Gummy Portal** (`../portal`, the
 * pill-sidebar showcase, no API). `bookshopWorkspace()` is what
 * `scripts/bookshop.ts` writes to `demo/gummy/workspace.json`, and
 * `bookshopFolders()` the exported `projects/book-shop/` +
 * `projects/gummy-portal/` beside it — the same exporter the CLI runs on
 * every save.
 */

export const BOOKSHOP_PROJECT_ID = 'bs-project-book-shop'
export const BOOKSHOP_AUTH_ID = 'auth-bs-azure'
export const BOOKSHOP_API_URL = 'http://localhost:9100'
/** A fixed timestamp, so the generated files don't change between runs. */
const CREATED_AT = Date.UTC(2026, 9, 24)

export function bookshopAuth(): AuthDef {
  const base = createAuthDef('Book shop Azure')
  return {
    ...base,
    id: BOOKSHOP_AUTH_ID,
    profile: { enabled: true, read: { endpointId: E.staffByEmail, params: {}, extra: {} }, paths: 'data', emailParam: 'email', stateKey: 'me' },
    screens: {
      landing: { title: 'Gummy Books back office', message: 'Sign in with your work account to run the shop.', buttonLabel: 'Sign in with Microsoft' },
      denied: {
        title: 'No access',
        message: 'Your account is not an active member of the shop staff. Ask a manager to add you.',
        buttonLabel: 'Try another account',
      },
      loading: { message: 'Signing you in…' },
    },
    userMenu: { ...base.userMenu, idLabel: 'Employee ID' },
  }
}

/** `API_URL` (the mock API) and the four sign-in vars, locked like a picked entry's (blank: the demo signs in with a mock account). */
function bookshopEnv(auth: AuthDef): EnvVarDef[] {
  return [
    { id: 'bs-env-api-url', name: 'API_URL', value: BOOKSHOP_API_URL, locked: true },
    ...(['tenantId', 'clientId', 'redirectUri', 'scope'] as const).map((role) => ({
      id: `bs-env-${role}`,
      name: auth.env[role],
      value: auth.devValues[role],
      locked: true,
    })),
  ]
}

function bookshopTheme(): StudioThemeConfig {
  return {
    appearance: 'light',
    accentColor: 'iris',
    radius: 'medium',
    panelBackground: 'solid',
    surface: 'flat',
    background: createDefaultBackdrop(),
    buttonColor: '',
    dataTable: {
      headerColor: '',
      headerTextColor: '',
      headerFontSize: 'sm',
      headerFontWeight: 'semibold',
      headerHoverColor: '',
      paginationButtonColor: '',
      paginationButtonHoverColor: '',
      rowHoverColor: '',
      editButtonColor: '',
      deleteButtonColor: 'red',
    },
  }
}

/** The app bar painted with an indigo gradient (the custom app-bar paint). */
function bookshopShell(): ShellSettings {
  const base = defaultShell('Gummy Books')
  return {
    ...base,
    // A warm text on the iris active item, instead of the accent's white contrast.
    menuActiveColor: '#fde68a',
    // Pages fade up into place on every route change (the engine default 250 ms).
    pageTransition: { type: 'fade-up', duration: '', easing: 'ease-out' },
    appBar: {
      ...base.appBar,
      icon: 'bookOpen',
      variant: 'custom',
      gradient: { enabled: true, from: '#1e1b4b', to: '#4f46e5', angle: 90 },
      foreground: 'light',
    },
  }
}

function bookshopMenu(): MenuItemDef[] {
  const link = (id: string, label: string, icon: string, pageId: string): MenuItemDef => ({ id, kind: 'page', label, icon, navigate: navigate(pageId) })
  return [
    link('bs-menu-dashboard', 'Dashboard', 'layoutDashboard', P.dashboard),
    link('bs-menu-catalogue', 'Catalogue', 'library', P.catalogue),
    { id: 'bs-menu-divider-1', kind: 'divider' },
    link('bs-menu-books', 'Books', 'bookOpen', P.books),
    link('bs-menu-authors', 'Authors', 'users', P.authors),
    link('bs-menu-orders', 'Orders', 'shoppingCart', P.orders),
    link('bs-menu-customers', 'Customers', 'user', P.customers),
    { id: 'bs-menu-divider-2', kind: 'divider' },
    link('bs-menu-settings', 'Settings', 'settings', P.settings),
  ]
}

function bookshopCustomActions(): CustomActionDef[] {
  return [{ id: PRINT_ORDER_ACTION_ID, name: 'printOrder', description: 'Opens the browser print dialog for the order on screen' }]
}

function bookshopCustomComponents(): CustomComponentDef[] {
  return [
    {
      id: SALES_CHART_COMPONENT_ID,
      name: 'SalesChart',
      description: 'A bar per day of the bound array (date + total); draws its own skeleton while loading',
      props: [
        { key: 'labelField', kind: 'text', label: 'Label field', options: [], defaultValue: 'date' },
        { key: 'valueField', kind: 'text', label: 'Value field', options: [], defaultValue: 'total' },
        { key: 'color', kind: 'select', label: 'Bar colour', options: ['accent', 'green', 'blue', 'orange'], defaultValue: 'accent' },
        { key: 'height', kind: 'number', label: 'Height (px)', options: [], defaultValue: '200' },
      ],
    },
  ]
}

/**
 * The studio's built-in page templates with their random ids and timestamps
 * pinned (each id mapped to a stable one, consistently, so references inside a
 * template still match) — the generated workspace must be the same every run.
 */
function stableTemplates(): TemplateDef[] {
  const ids = new Map<string, string>()
  const text = JSON.stringify(builtinTemplates()).replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g,
    (uuid) => ids.get(uuid) ?? (ids.set(uuid, `bs-tpl-${ids.size + 1}`), ids.get(uuid)!),
  )
  return (JSON.parse(text) as TemplateDef[]).map((t) => ({ ...t, updatedAt: CREATED_AT }))
}

export function bookshopLibrary(): LibraryData {
  return { groups: [], models: bookshopModels(), endpoints: bookshopEndpoints(), templates: stableTemplates(), auth: [bookshopAuth()] }
}

export function bookshopProject(library: LibraryData = bookshopLibrary()): ProjectDef {
  const auth = library.auth?.find((a) => a.id === BOOKSHOP_AUTH_ID) ?? bookshopAuth()
  return {
    id: BOOKSHOP_PROJECT_ID,
    name: 'Book shop',
    description: 'Gummy Books — a staff back office for a book shop, designed in the studio and rendered from JSON by the demo app.',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    snapshot: {
      pages: bookshopPages(),
      menu: bookshopMenu(),
      shell: bookshopShell(),
      env: bookshopEnv(auth),
      theme: bookshopTheme(),
      endpointIds: library.endpoints.map((e) => e.id),
      globalLoads: [],
      customActions: bookshopCustomActions(),
      customComponents: bookshopCustomComponents(),
      authId: auth.id,
    },
  }
}

/** The persisted studio state, at the current workspace version. */
export function bookshopWorkspace(): WorkspaceData {
  const library = bookshopLibrary()
  return {
    version: 56,
    appearance: 'light',
    user: 'Chanwit Yimneam',
    projects: [bookshopProject(library), portalProject(), glassProject()],
    library,
    activity: [],
  }
}

/** What `gummy studio` writes to `workspace.json`: the persist middleware's `{ state, version }` payload. */
export function bookshopWorkspaceFile(workspace: WorkspaceData = bookshopWorkspace()): { state: WorkspaceData; version: number } {
  return { state: workspace, version: workspace.version }
}

/** The exported project folders by file key — `book-shop`, `gummy-portal`, `glass-showcase`. */
export function bookshopFolders(workspace: WorkspaceData = bookshopWorkspace()): Record<string, ProjectFolder> {
  return projectFolders(workspace.projects, workspace.library)
}

export const BOOKSHOP_KEY = projectKey('Book shop')
