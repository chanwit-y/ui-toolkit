import type { StudioThemeConfig } from '../../Theme/types'
import { defaultContainerSettings, type GridItemData } from '../../Layout/types'
import { defaultShell } from '../../Workspace/snapshots'
import { projectKey } from '../../Workspace/runtimeProject'
import type { MenuItemDef, PageDef, ProjectDef, ShellSettings } from '../../Workspace/types'
import { FULL, HALF, QUARTER, heading, html, justify, navButton, navigate, settings } from '../bookshop/ui'

/**
 * Gummy Portal — the demo's second project (see the grilled design
 * `sidebar-pill-variant`): a small staff portal whose point is the shell, the
 * **pill** sidebar with its footer "Hide Menu" toggle, an active gradient and
 * the edge indicator, beside the Book shop's plain one. Static pages (HTML
 * content and typography only), no API and no sign-in, so it renders with
 * nothing else running: `VITE_GUMMY_PROJECT=gummy-portal`.
 */

export const PORTAL_PROJECT_ID = 'gp-project-portal'
const CREATED_AT = Date.UTC(2026, 9, 25)

const P = {
  home: 'gp-page-home',
  applications: 'gp-page-applications',
  approvals: 'gp-page-approvals',
  communications: 'gp-page-communications',
  profile: 'gp-page-settings-profile',
  notifications: 'gp-page-settings-notifications',
} as const

function page(id: string, key: string, name: string, path: string, items: GridItemData[], extra: Partial<PageDef> = {}): PageDef {
  return { id, key, name, path, grid: { items, containerSettings: defaultContainerSettings, fieldSeq: 0 }, ...extra }
}

/** Static markup: no `{{…}}` placeholders, so no binding. */
const block = (id: string, name: string, markup: string, colSpan = FULL) => html(id, name, markup, null, colSpan, false)

/* -------------------------------------------------------------- markup bits */

const CARD = 'border:1px solid var(--gray-a5);border-radius:14px;background:var(--color-panel-solid);padding:16px'
const SECTION = 'margin:8px 0 12px;font-size:18px;font-weight:600;color:var(--accent-11)'

function appTile(name: string, letter: string, hue: string): string {
  return `<a href="#" style="display:flex;flex-direction:column;align-items:center;gap:8px;text-decoration:none;color:var(--gray-12)">
  <span style="display:flex;width:72px;height:72px;align-items:center;justify-content:center;border-radius:18px;background:var(--${hue}-3);color:var(--${hue}-11);font-size:26px;font-weight:700;box-shadow:0 1px 2px var(--gray-a4)">${letter}</span>
  <span style="font-size:13px;font-weight:500">${name}</span>
</a>`
}

function appGrid(apps: [string, string, string][]): string {
  return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:20px">${apps.map((a) => appTile(...a)).join('')}</div>`
}

const FAVORITES: [string, string, string][] = [
  ['DOA', 'D', 'iris'],
  ['Leave', 'L', 'grass'],
  ['Expense', 'E', 'amber'],
  ['Room booking', 'R', 'cyan'],
]

const ALL_APPS: [string, string, string][] = [
  ...FAVORITES,
  ['IT help', 'I', 'crimson'],
  ['Payslip', 'P', 'jade'],
  ['Training', 'T', 'violet'],
  ['Travel', 'T', 'sky'],
  ['Procurement', 'P', 'orange'],
  ['Assets', 'A', 'bronze'],
  ['Visitors', 'V', 'plum'],
  ['Directory', 'D', 'gray'],
]

type Request = { title: string; who: string; when: string; kind: string }

const REQUESTS: Request[] = [
  { title: 'Leave — 3 days annual leave', who: 'Pimchanok S.', when: 'Today, 09:12', kind: 'Leave' },
  { title: 'Expense claim — client dinner', who: 'Nadia S.', when: 'Yesterday', kind: 'Expense' },
  { title: 'Purchase request — 4 monitors', who: 'Somchai K.', when: '2 days ago', kind: 'Procurement' },
  { title: 'Travel — Singapore, 12–14 Nov', who: 'Arthit P.', when: '3 days ago', kind: 'Travel' },
]

function requestRow(r: Request): string {
  return `<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid var(--gray-a4)">
  <span style="display:inline-flex;padding:2px 8px;border-radius:9999px;background:var(--accent-3);color:var(--accent-11);font-size:12px;font-weight:500">${r.kind}</span>
  <span style="flex:1;min-width:0">
    <span style="display:block;font-weight:500;color:var(--gray-12)">${r.title}</span>
    <span style="display:block;font-size:12px;color:var(--gray-11)">${r.who} · ${r.when}</span>
  </span>
  <span style="font-size:13px;font-weight:500;color:var(--accent-11)">Review →</span>
</div>`
}

type Post = { title: string; body: string; when: string; tag: string }

const POSTS: Post[] = [
  { title: 'Dear Team, the new office opens on Monday', body: 'Desks on floors 7 and 8 are ready; badges work from 08:00. Parking passes stay the same.', when: 'Today', tag: 'Announcement' },
  { title: 'Year-end town hall', body: 'Join us on 12 December at 15:00 in the main hall or online — questions welcome in advance.', when: 'Yesterday', tag: 'Event' },
  { title: 'Security reminder: phishing emails', body: 'IT will never ask for your password. Report a suspicious message with the Report button.', when: 'This week', tag: 'IT' },
]

function postCard(p: Post): string {
  return `<article style="${CARD};display:flex;gap:14px">
  <span style="display:flex;width:44px;height:44px;flex-shrink:0;align-items:center;justify-content:center;border-radius:12px;background:var(--accent-9);color:var(--accent-contrast);font-weight:700">${p.tag[0]}</span>
  <span style="min-width:0">
    <span style="display:block;font-size:12px;color:var(--gray-11)">${p.tag} · ${p.when}</span>
    <span style="display:block;margin-top:2px;font-weight:600;color:var(--gray-12)">${p.title}</span>
    <span style="display:block;margin-top:4px;font-size:14px;color:var(--gray-11)">${p.body}</span>
  </span>
</article>`
}

/* -------------------------------------------------------------------- pages */

function homePage(): PageDef {
  return page(P.home, 'home', 'Home', '/', [
    ...heading('gp-home-heading', 'Welcome back', 'Keep up to date with what’s happening across Gummy.'),
    block(
      'gp-home-favorites',
      'favorites',
      `<h4 style="${SECTION}">Favorite apps</h4>${appGrid(FAVORITES)}`,
    ),
    block(
      'gp-home-approvals',
      'approvalsSummary',
      `<h4 style="${SECTION}">Approvals</h4>
<div style="border-radius:16px;padding:20px;background:linear-gradient(135deg,var(--indigo-12),var(--iris-10));color:white">
  <span style="display:inline-flex;padding:2px 10px;border:1px solid rgba(255,255,255,.4);border-radius:9999px;font-size:12px">Overview</span>
  <div style="display:flex;gap:32px;margin-top:16px">
    <div><div style="font-size:30px;font-weight:700">${REQUESTS.length}</div><div style="font-size:13px;opacity:.8">waiting for you</div></div>
    <div><div style="font-size:30px;font-weight:700">12</div><div style="font-size:13px;opacity:.8">approved this month</div></div>
  </div>
</div>`,
      HALF,
    ),
    block(
      'gp-home-communications',
      'latestNews',
      `<h4 style="${SECTION}">Communications</h4><div style="display:grid;gap:12px">${postCard(POSTS[0])}</div>`,
      HALF,
    ),
    { ...navButton('gp-home-to-approvals', 'Go to approvals', 'stamp', navigate(P.approvals)), settings: settings(QUARTER, justify('start')) },
  ])
}

function applicationsPage(): PageDef {
  return page(P.applications, 'applications', 'Applications', '/applications', [
    ...heading('gp-apps-heading', 'Applications', 'Every app you can open with your Gummy account.'),
    block('gp-apps-grid', 'allApps', `<div style="${CARD};padding:24px">${appGrid(ALL_APPS)}</div>`),
  ])
}

function approvalsPage(): PageDef {
  return page(P.approvals, 'approvals', 'Approvals', '/approvals', [
    ...heading('gp-approvals-heading', 'Approvals', 'Requests waiting for your decision, newest first.'),
    block('gp-approvals-list', 'requests', `<div style="${CARD};padding:4px 16px">${REQUESTS.map(requestRow).join('').replace('border-top:1px solid var(--gray-a4)', 'border-top:0')}</div>`),
  ])
}

function communicationsPage(): PageDef {
  return page(P.communications, 'communications', 'Communications', '/communications', [
    ...heading('gp-comms-heading', 'Communications', 'Announcements, events and reminders from around the company.'),
    block('gp-comms-posts', 'posts', `<div style="display:grid;gap:12px">${POSTS.map(postCard).join('')}</div>`),
  ])
}

function settingRow(label: string, hint: string, value: string): string {
  return `<div style="display:flex;align-items:center;gap:12px;padding:14px 0;border-top:1px solid var(--gray-a4)">
  <span style="flex:1"><span style="display:block;font-weight:500;color:var(--gray-12)">${label}</span><span style="display:block;font-size:12px;color:var(--gray-11)">${hint}</span></span>
  <span style="font-size:14px;color:var(--gray-12)">${value}</span>
</div>`
}

function profilePage(): PageDef {
  return page(P.profile, 'settingsProfile', 'Profile', '/settings/profile', [
    ...heading('gp-profile-heading', 'Profile', 'How you appear to colleagues across the portal.'),
    block(
      'gp-profile-rows',
      'profile',
      `<div style="${CARD};padding:4px 16px">${[
        settingRow('Name', 'From your Microsoft account', 'Chanwit Yimneam'),
        settingRow('Job title', 'Set by HR', 'Product Owner'),
        settingRow('Language', 'Used for menus and emails', 'English'),
      ]
        .join('')
        .replace('border-top:1px solid var(--gray-a4)', 'border-top:0')}</div>`,
    ),
  ])
}

function notificationsPage(): PageDef {
  return page(P.notifications, 'settingsNotifications', 'Notifications', '/settings/notifications', [
    ...heading('gp-notify-heading', 'Notifications', 'Choose what reaches your inbox.'),
    block(
      'gp-notify-rows',
      'notifications',
      `<div style="${CARD};padding:4px 16px">${[
        settingRow('Approvals', 'A request waits for you', 'Email + portal'),
        settingRow('Communications', 'A new announcement is posted', 'Portal only'),
        settingRow('Weekly digest', 'Monday, 08:00', 'Email'),
      ]
        .join('')
        .replace('border-top:1px solid var(--gray-a4)', 'border-top:0')}</div>`,
    ),
  ])
}

export function portalPages(): PageDef[] {
  return [homePage(), applicationsPage(), approvalsPage(), communicationsPage(), profilePage(), notificationsPage()]
}

/* -------------------------------------------------------------------- shell */

/** The menu of the reference screen: four links and a Settings group. */
function portalMenu(): MenuItemDef[] {
  const link = (id: string, label: string, icon: string, pageId: string): MenuItemDef => ({ id, kind: 'page', label, icon, navigate: navigate(pageId) })
  return [
    link('gp-menu-home', 'Home', 'home', P.home),
    link('gp-menu-applications', 'Applications', 'grid', P.applications),
    link('gp-menu-approvals', 'Approvals', 'stamp', P.approvals),
    link('gp-menu-communications', 'Communications', 'newspaper', P.communications),
    {
      id: 'gp-menu-settings',
      kind: 'group',
      label: 'Settings',
      icon: 'settings',
      collapsed: true,
      items: [
        link('gp-menu-settings-profile', 'Profile', 'user', P.profile),
        link('gp-menu-settings-notifications', 'Notifications', 'bell', P.notifications),
      ],
    },
  ]
}

/** The pill sidebar: footer toggle, a sky → lavender active gradient, an indigo indicator. */
function portalShell(): ShellSettings {
  const base = defaultShell('Gummy Portal')
  return {
    ...base,
    breadcrumbs: false,
    appBar: { ...base.appBar, icon: 'layoutDashboard' },
    sidebar: {
      ...base.sidebar,
      variant: 'pill',
      toggle: 'footer',
      activeGradient: { enabled: true, from: '#e0f2fe', to: '#c4b5fd', angle: 90 },
      indicatorColor: '#3730a3',
    },
  }
}

function portalTheme(): StudioThemeConfig {
  return {
    appearance: 'light',
    accentColor: 'indigo',
    radius: 'large',
    panelBackground: 'solid',
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
      deleteButtonColor: '',
    },
  }
}

export function portalProject(): ProjectDef {
  return {
    id: PORTAL_PROJECT_ID,
    name: 'Gummy Portal',
    description: 'A staff portal showing the pill sidebar — gradient active item, edge indicator, footer "Hide Menu" toggle.',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    snapshot: {
      pages: portalPages(),
      menu: portalMenu(),
      shell: portalShell(),
      env: [],
      theme: portalTheme(),
      endpointIds: [],
      globalLoads: [],
      customActions: [],
      customComponents: [],
      authId: null,
    },
  }
}

export const PORTAL_KEY = projectKey('Gummy Portal')
