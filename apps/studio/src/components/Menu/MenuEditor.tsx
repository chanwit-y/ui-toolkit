import {
  AppSidebar,
  DEFAULT_PAGE_TRANSITION_DURATION,
  IconData,
  appBarStyle,
  appBarTone,
  playPageTransition,
  type TMenu,
  type TPageEntries,
} from '@gummy-ui/ui'
import { Play, Plus, Trash2, Upload, X } from 'lucide-react'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import {
  Button,
  CodeViewer,
  IconButton,
  IconField,
  Input,
  SegmentedControl,
  Select,
  SortableCardList,
  cn,
} from '../common'
import { NavigateEditor, WiringHint } from '../Layout/ButtonConfigPanel'
import { NestedRouterBoundary } from '../Layout/NestedRouterBoundary'
import { DEFAULT_SIDEBAR_TOGGLE_LABEL, createMenuItem, menuToEngine, pageTransitionToEngine, shellToEngine } from '../Workspace/menu'
import type { AppBarSettings, MenuItemDef, PageDef, ShellSettings, SidebarSettings, StudioPageTransition } from '../Workspace/types'
import { defaultShell } from '../Workspace/snapshots'
import { useActiveProject, useWorkspaceStore } from '../Workspace/workspaceStore'

/** One labelled row in the config form. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-ui-sm font-medium text-ink-2">{label}</span>
      {children}
    </label>
  )
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

/** A CSS colour: a native picker swatch (hex only) beside the free text (`rgb(…)`, `var(--teal-9)` …). */
export function ColorInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  const hex = HEX.test(value.trim())
    ? value.trim().length === 4
      ? `#${value
          .trim()
          .slice(1)
          .split('')
          .map((c) => c + c)
          .join('')}`
      : value.trim()
    : '#888888'
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        aria-label="Pick a colour"
        value={hex}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-9 shrink-0 cursor-pointer rounded border border-line bg-panel p-0.5 disabled:opacity-50"
      />
      <Input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="font-mono"
      />
    </div>
  )
}

/** Logos bigger than this are refused: the data URL lives in the project JSON and every workspace save. */
const MAX_LOGO_BYTES = 300 * 1024

/**
 * The app bar logo: a URL, or an image uploaded from disk and stored as a
 * `data:` URL (so the exported project is self-contained), with a preview.
 */
function LogoField({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const uploaded = value.startsWith('data:')

  const pick = (file: File | undefined) => {
    setError(null)
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Pick an image file (PNG, SVG, JPEG, WebP …).')
    if (file.size > MAX_LOGO_BYTES) return setError(`That image is ${Math.round(file.size / 1024)} KB — keep the logo under ${MAX_LOGO_BYTES / 1024} KB.`)
    const reader = new FileReader()
    reader.onload = () => onChange(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => setError('Could not read that file.')
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-1">
      <span className="text-ui-sm font-medium text-ink-2">Logo</span>
      <div className="flex items-center gap-2">
        {value ? (
          <img src={value} alt="" className="h-8 w-8 shrink-0 rounded border border-line bg-panel object-contain p-0.5" />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-dashed border-line text-ink-3">
            <Upload size={13} />
          </span>
        )}
        {uploaded ? (
          <span className="field flex min-w-0 flex-1 items-center text-ui text-ink-2">Uploaded image ({Math.max(1, Math.round((value.length * 3) / 4 / 1024))} KB)</span>
        ) : (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://… (wins over the icon)"
            className="min-w-0 flex-1 font-mono"
          />
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            pick(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <Button size="sm" onClick={() => fileRef.current?.click()} title="Upload an image from disk">
          <Upload size={13} />
          Upload
        </Button>
        {value && (
          <IconButton label="Clear logo" onClick={() => onChange('')}>
            <X size={13} />
          </IconButton>
        )}
      </div>
      {error && <p className="text-ui-xs text-danger">{error}</p>}
    </div>
  )
}

const NO_TRANSITION: StudioPageTransition = { type: 'none', duration: '', easing: 'ease-out' }

/**
 * The page-change animation (see the grilled design `page-transition`): type,
 * duration and easing, plus Play, which runs the exact engine animation
 * (`playPageTransition`) on a sample page block.
 */
function PageTransitionField({ value, onChange }: { value: StudioPageTransition; onChange: (next: StudioPageTransition) => void }) {
  const sample = useRef<HTMLDivElement>(null)
  const off = value.type === 'none'
  const reduced = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  return (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Page transition">
          <Select
            value={value.type}
            onChange={(type) => onChange({ ...value, type: type as StudioPageTransition['type'] })}
            options={[
              { value: 'none', label: 'None' },
              { value: 'fade', label: 'Fade' },
              { value: 'fade-up', label: 'Fade up' },
              { value: 'slide', label: 'Slide in' },
              { value: 'scale', label: 'Scale' },
            ]}
          />
        </Field>
        <Field label="Duration (ms)">
          <Input
            type="number"
            min={0}
            max={2000}
            step={50}
            disabled={off}
            value={value.duration}
            placeholder={String(DEFAULT_PAGE_TRANSITION_DURATION)}
            onChange={(e) => onChange({ ...value, duration: e.target.value === '' ? '' : Number(e.target.value) })}
          />
        </Field>
        <Field label="Easing">
          <Select
            value={value.easing}
            disabled={off}
            onChange={(easing) => onChange({ ...value, easing: easing as StudioPageTransition['easing'] })}
            options={[
              { value: 'ease-out', label: 'Ease out' },
              { value: 'ease-in-out', label: 'Ease in-out' },
              { value: 'linear', label: 'Linear' },
            ]}
          />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" disabled={off} onClick={() => playPageTransition(sample.current, pageTransitionToEngine(value))}>
          <Play size={13} />
          Play
        </Button>
        <div ref={sample} aria-hidden="true" className="flex h-12 w-40 flex-col justify-center gap-1.5 rounded-md border border-line bg-panel px-3">
          <span className="h-1.5 w-20 rounded bg-ink-3/40" />
          <span className="h-1.5 w-28 rounded bg-ink-3/25" />
          <span className="h-1.5 w-16 rounded bg-ink-3/25" />
        </div>
        {reduced && <span className="text-ui-xs text-ink-3">Your system asks for reduced motion, so nothing plays here or in the app.</span>}
      </div>
      <p className="text-ui-xs text-ink-3">
        Plays when the page’s path changes (a :param too, not a query-string change), never on the first page. The page
        isn’t rebuilt, so data and form input stay; a page still loading animates once its content is in.
      </p>
    </div>
  )
}

/** The bar as the exported app will paint it (title, mark, colour / gradient, padding). */
function AppBarPreview({ bar, title }: { bar: AppBarSettings; title: string }) {
  const engine = shellToEngine({ ...defaultShell(title), breadcrumbs: false, appBar: bar }).appBar ?? {}
  const tone = appBarTone(engine)
  const cls =
    tone === 'panel'
      ? 'border-[var(--gray-6)] bg-[var(--color-panel-solid)] text-[var(--gray-12)]'
      : tone === 'accent'
        ? 'border-[var(--accent-10)] bg-[var(--accent-9)] text-[var(--accent-contrast)]'
        : 'border-transparent'
  const Glyph = engine.icon ? IconData[engine.icon] : null
  return (
    <div
      className={cn('flex items-center gap-2 overflow-hidden rounded-md border text-sm font-semibold', !engine.padding && 'px-3', cls)}
      style={appBarStyle(engine)}
      aria-hidden="true"
    >
      {engine.logo ? (
        <img src={engine.logo} alt="" className="w-auto shrink-0 rounded object-contain" style={{ height: engine.logoSize ?? '1.5rem' }} />
      ) : Glyph ? (
        <Glyph size={18} className="shrink-0" />
      ) : null}
      <span className="truncate">{engine.title || title}</span>
    </div>
  )
}

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-ui-sm font-medium text-ink-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-line-strong accent-accent"
      />
      {label}
    </label>
  )
}

/** The route the preview opens on: the first page link's page, its fixed params filled. */
function firstLinkPath(menu: TMenu, pages: TPageEntries): string | undefined {
  for (const item of menu) {
    if ('items' in item) {
      const inner = firstLinkPath(item.items, pages)
      if (inner) return inner
    } else if ('navigate' in item) {
      const page = pages[item.navigate.page]
      if (!page) continue
      return page.path.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_, k: string) => {
        const dv = item.navigate.params?.[k]
        return dv?.type === 'value' ? String(dv.value) : k
      })
    }
  }
  return undefined
}

/**
 * The library's own `AppSidebar` over the project's real menu, in a memory
 * router: links navigate (the active item follows), groups open, the footer
 * toggle and the Expanded / Rail switch collapse it — what the exported app
 * draws, before opening the Live Preview.
 */
function SidebarPreview({ shell, menu, pages }: { shell: ShellSettings; menu: MenuItemDef[]; pages: PageDef[] }) {
  const [rail, setRail] = useState(false)
  const engineMenu = useMemo(() => menuToEngine(menu, pages), [menu, pages])
  const enginePages = useMemo(
    () => Object.fromEntries(pages.map((p) => [p.key, { path: p.path, title: p.name, containers: [] }])) as TPageEntries,
    [pages],
  )
  const start = useMemo(() => firstLinkPath(engineMenu, enginePages) ?? '/', [engineMenu, enginePages])
  const engine = shellToEngine(shell)
  return (
    <div className="space-y-2">
      <SegmentedControl
        aria-label="Sidebar preview mode"
        options={[
          { value: 'expanded', label: 'Expanded' },
          { value: 'rail', label: 'Rail' },
        ]}
        value={rail ? 'rail' : 'expanded'}
        onChange={(v) => setRail(v === 'rail')}
      />
      <div className="flex h-80 overflow-hidden rounded-md border border-line bg-[var(--color-background)]">
        {engineMenu.length === 0 ? (
          <p className="m-auto text-ui-sm text-ink-3">Add menu items below to see the sidebar.</p>
        ) : (
          <NestedRouterBoundary>
            <MemoryRouter key={start} initialEntries={[start]}>
              <AppSidebar
                menu={engineMenu}
                pages={enginePages}
                sidebar={engine.sidebar}
                rail={rail}
                onToggleRail={shell.collapsible ? () => setRail((r) => !r) : undefined}
                toggleIcons={engine.appBar?.sidebarToggle}
                menuIcons={shell.menuIcons}
                menuActiveColor={engine.menuActiveColor}
                className="flex h-full border-r border-[var(--gray-6)]"
              />
            </MemoryRouter>
          </NestedRouterBoundary>
        )}
        <div aria-hidden="true" className="flex min-w-0 flex-1 flex-col gap-2 p-4">
          <span className="h-2 w-32 rounded bg-[var(--gray-5)]" />
          <span className="h-2 w-48 rounded bg-[var(--gray-4)]" />
          <span className="h-2 w-40 rounded bg-[var(--gray-4)]" />
        </div>
      </div>
    </div>
  )
}

/** The Sidebar section: look (plain / pill + colours, indicator, rail width) and the collapse toggle. */
function SidebarSection({
  shell,
  menu,
  pages,
  setShell,
}: {
  shell: ShellSettings
  menu: MenuItemDef[]
  pages: PageDef[]
  setShell: (patch: Partial<ShellSettings>) => void
}) {
  const sb = shell.sidebar
  const set = (patch: Partial<SidebarSettings>) => setShell({ sidebar: { ...sb, ...patch } })
  const setToggleIcons = (patch: Partial<AppBarSettings['sidebarToggle']>) =>
    setShell({ appBar: { ...shell.appBar, sidebarToggle: { ...shell.appBar.sidebarToggle, ...patch } } })
  const pill = sb.variant === 'pill'
  const footer = sb.toggle === 'footer'
  const indicatorOn = sb.indicator ?? pill
  return (
    <section className="mt-3 box space-y-3 p-3">
      <span className="sec-label block">Sidebar</span>
      <SidebarPreview shell={shell} menu={menu} pages={pages} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <span className="text-ui-sm font-medium text-ink-2">Style</span>
          <div>
            <SegmentedControl
              aria-label="Sidebar style"
              options={[
                { value: 'plain', label: 'Plain' },
                { value: 'pill', label: 'Pill' },
              ]}
              value={sb.variant}
              onChange={(v) => set({ variant: v as SidebarSettings['variant'] })}
            />
          </div>
        </div>
        <Field label="Rail width">
          <Input
            value={sb.railWidth}
            onChange={(e) => set({ railWidth: e.target.value })}
            placeholder={`Default: ${pill ? '4.5rem' : '3.5rem'} (CSS width)`}
            className="font-mono"
          />
        </Field>
      </div>
      <CheckboxRow
        label="Collapsible sidebar (collapse to an icon rail)"
        checked={shell.collapsible}
        onChange={(collapsible) => setShell({ collapsible })}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <span className="text-ui-sm font-medium text-ink-2">Collapse toggle</span>
          <div>
            <SegmentedControl
              aria-label="Collapse toggle placement"
              options={[
                { value: 'header', label: 'Top bar' },
                { value: 'footer', label: 'Sidebar footer' },
              ]}
              value={sb.toggle}
              onChange={(v) => set({ toggle: v as SidebarSettings['toggle'] })}
            />
          </div>
        </div>
        <Field label="Toggle label">
          <Input
            value={sb.toggleLabel}
            disabled={!shell.collapsible || !footer}
            onChange={(e) => set({ toggleLabel: e.target.value })}
            placeholder={`Default: ${DEFAULT_SIDEBAR_TOGGLE_LABEL}`}
          />
        </Field>
        <IconField
          label="Hide sidebar icon"
          placeholder={`Default: ${footer ? 'arrowLeft' : 'chevronLeft'}`}
          disabled={!shell.collapsible}
          value={shell.appBar.sidebarToggle.hide}
          onChange={(hide) => setToggleIcons({ hide })}
        />
        <IconField
          label="Show sidebar icon"
          placeholder={`Default: ${footer ? 'arrowRight' : 'chevronRight'}`}
          disabled={!shell.collapsible}
          value={shell.appBar.sidebarToggle.show}
          onChange={(show) => setToggleIcons({ show })}
        />
      </div>
      {pill && (
        <div className="space-y-3 rounded-md border border-line bg-panel-2 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Item colour">
              <ColorInput
                value={sb.itemBackground}
                onChange={(itemBackground) => set({ itemBackground })}
                placeholder="Default: --accent-2 · #f5f3ff"
              />
            </Field>
            <Field label="Active colour">
              <ColorInput
                value={sb.activeBackground}
                disabled={sb.activeGradient.enabled}
                onChange={(activeBackground) => set({ activeBackground })}
                placeholder="Default: an accent gradient"
              />
            </Field>
          </div>
          <CheckboxRow
            label="Active gradient"
            checked={sb.activeGradient.enabled}
            onChange={(enabled) => set({ activeGradient: { ...sb.activeGradient, enabled } })}
          />
          {sb.activeGradient.enabled && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="From">
                <ColorInput
                  value={sb.activeGradient.from}
                  onChange={(from) => set({ activeGradient: { ...sb.activeGradient, from } })}
                  placeholder="#e0f2fe"
                />
              </Field>
              <Field label="To">
                <ColorInput
                  value={sb.activeGradient.to}
                  onChange={(to) => set({ activeGradient: { ...sb.activeGradient, to } })}
                  placeholder="#c4b5fd"
                />
              </Field>
              <Field label="Angle (deg)">
                <Input
                  type="number"
                  min={0}
                  max={360}
                  step={1}
                  value={sb.activeGradient.angle}
                  onChange={(e) => set({ activeGradient: { ...sb.activeGradient, angle: Number(e.target.value) || 0 } })}
                />
              </Field>
            </div>
          )}
        </div>
      )}
      <div className="grid items-end gap-3 sm:grid-cols-2">
        <CheckboxRow
          label="Indicator bar beside the active item"
          checked={indicatorOn}
          onChange={(indicator) => set({ indicator: indicator === pill ? null : indicator })}
        />
        <Field label="Indicator colour">
          <ColorInput
            value={sb.indicatorColor}
            disabled={!indicatorOn}
            onChange={(indicatorColor) => set({ indicatorColor })}
            placeholder="Default: --accent-11 · #3730a3"
          />
        </Field>
      </div>
      <p className="text-ui-xs text-ink-3">
        {shell.navigation === 'top'
          ? 'With the top-bar placement there is no sidebar on desktop; the mobile drawer still draws this look. '
          : ''}
        Pill draws every item as a tinted card and the active one in a gradient; the colours follow the theme
        accent unless set. The footer toggle shows its label while expanded and the icon alone on the rail.
        Exported as <span className="font-mono">shell.sidebar</span>.
      </p>
    </section>
  )
}

/** The glyph for a stored icon key, or null when unset / unknown. */
function MenuGlyph({ icon, size = 14, className }: { icon: string; size?: number; className?: string }) {
  const Glyph = icon ? IconData[icon as keyof typeof IconData] : undefined
  if (!Glyph) return null
  return <Glyph size={size} className={className} aria-hidden="true" />
}

const KIND_LABEL: Record<MenuItemDef['kind'], string> = {
  page: 'Page link',
  link: 'External link',
  group: 'Group',
  divider: 'Divider',
}

/** The add-item row (a group offers everything but another group). */
function AddRow({ onAdd, nested }: { onAdd: (kind: MenuItemDef['kind']) => void; nested?: boolean }) {
  const kinds: MenuItemDef['kind'][] = nested ? ['page', 'link', 'divider'] : ['page', 'group', 'link', 'divider']
  return (
    <div className="flex flex-wrap gap-1.5">
      {kinds.map((k) => (
        <Button key={k} size="sm" onClick={() => onAdd(k)}>
          <Plus size={13} aria-hidden="true" />
          {KIND_LABEL[k]}
        </Button>
      ))}
    </div>
  )
}

function ItemCard({
  item,
  grip,
  collapsed,
  onChange,
  onRemove,
  nested,
}: {
  item: MenuItemDef
  grip: ReactNode
  collapsed: boolean
  onChange: (next: MenuItemDef) => void
  onRemove: () => void
  nested?: boolean
}) {
  const title =
    item.kind === 'divider' ? 'Divider' : item.label || `(untitled ${KIND_LABEL[item.kind].toLowerCase()})`
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {grip}
        <span className="tag">{KIND_LABEL[item.kind]}</span>
        {item.kind !== 'divider' && item.icon && (
          <MenuGlyph icon={item.icon} size={14} className="shrink-0 text-ink-2" />
        )}
        <span className="min-w-0 flex-1 truncate text-ui font-medium text-ink">{title}</span>
        <IconButton label="Remove item" className="btn-icon-sm" onClick={onRemove}>
          <Trash2 size={13} aria-hidden="true" />
        </IconButton>
      </div>
      {!collapsed && item.kind !== 'divider' && (
        <div className={cn('space-y-2', nested && 'pl-1')}>
          <Field label="Label">
            <Input value={item.label} onChange={(e) => onChange({ ...item, label: e.target.value })} />
          </Field>
          <IconField value={item.icon} onChange={(icon) => onChange({ ...item, icon })} />
          {item.kind === 'page' && (
            <NavigateEditor value={item.navigate} onChange={(navigate) => onChange({ ...item, navigate })} />
          )}
          {item.kind === 'link' && (
            <>
              <Field label="URL">
                <Input
                  value={item.href}
                  onChange={(e) => onChange({ ...item, href: e.target.value })}
                  placeholder="https://…"
                  className="font-mono"
                />
              </Field>
              <CheckboxRow
                label="Open in a new tab"
                checked={item.newTab}
                onChange={(newTab) => onChange({ ...item, newTab })}
              />
            </>
          )}
          {item.kind === 'group' && (
            <>
              <CheckboxRow
                label="Start collapsed"
                checked={item.collapsed}
                onChange={(collapsed) => onChange({ ...item, collapsed })}
              />
              <div className="space-y-2 rounded-md border border-line bg-sunken p-2">
                <span className="sec-label block">Items</span>
                <ItemList
                  items={item.items}
                  onChange={(items) => onChange({ ...item, items })}
                  nested
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ItemList({
  items,
  onChange,
  nested,
}: {
  items: MenuItemDef[]
  onChange: (next: MenuItemDef[]) => void
  nested?: boolean
}) {
  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <SortableCardList
          items={items}
          onReorder={onChange}
          cardClassName="box p-2.5"
          gripLabel={(it, i) => `Move item ${i + 1}${'label' in it && it.label ? ` (${it.label})` : ''}`}
        >
          {(item, index, ctx) => (
            <ItemCard
              item={item}
              grip={ctx.grip}
              collapsed={ctx.dragging}
              nested={nested}
              onChange={(next) => onChange(items.map((it, i) => (i === index ? next : it)))}
              onRemove={() => onChange(items.filter((_, i) => i !== index))}
            />
          )}
        </SortableCardList>
      )}
      <AddRow nested={nested} onAdd={(kind) => onChange([...items, createMenuItem(kind)])} />
    </div>
  )
}

/**
 * The Menu page (see the grilled app-shell design): the project's sidebar
 * menu — page links (the shared NavigateEditor, so fixed `:params` work),
 * groups one level deep, external links and dividers — reordered with the
 * sortable card list, written straight into the project snapshot, and shown
 * below as the `menu.ts` the export bundles. The Live Preview renders it in
 * the real `AppShell`.
 */
export function MenuEditor() {
  const project = useActiveProject()
  const updateProjectMenu = useWorkspaceStore((s) => s.updateProjectMenu)
  const updateProjectShell = useWorkspaceStore((s) => s.updateProjectShell)
  const menu = project?.snapshot.menu ?? []
  const pages = project?.snapshot.pages ?? []
  const shell = project?.snapshot.shell ?? defaultShell()
  const menuJson = useMemo(
    () => JSON.stringify({ menu: menuToEngine(menu, pages), shell: shellToEngine(shell) }, null, 2),
    [menu, pages, shell],
  )

  if (!project) return null
  const set = (next: MenuItemDef[]) => updateProjectMenu(project.id, next)
  const setShell = (patch: Partial<ShellSettings>) => updateProjectShell(project.id, { ...shell, ...patch })
  const setAppBar = (patch: Partial<AppBarSettings>) => setShell({ appBar: { ...shell.appBar, ...patch } })

  const pageLinks = menu.flatMap((i) => (i.kind === 'group' ? i.items : [i])).filter((i) => i.kind === 'page')
  const unwired = pageLinks.filter((i) => i.kind === 'page' && !i.navigate.pageId).length

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-surface">
      <div className="mx-auto max-w-[760px] px-6 pb-16 pt-6">
        <h2 className="text-[15px] font-semibold text-ink">Menu</h2>
        <p className="mt-1 text-ui text-ink-2">
          The navigation of the exported app. Items point at pages by key, so the active entry follows
          the route; detail pages reached by row clicks or buttons don’t need an entry.
        </p>

        <section className="mt-5 box space-y-3 p-3">
          <span className="sec-label block">Layout</span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="text-ui-sm font-medium text-ink-2">Menu placement</span>
              <SegmentedControl
                aria-label="Menu placement"
                options={[
                  { value: 'sidebar', label: 'Sidebar' },
                  { value: 'top', label: 'Top bar' },
                ]}
                value={shell.navigation}
                onChange={(v) => setShell({ navigation: v as ShellSettings['navigation'] })}
              />
            </div>
            <CheckboxRow
              label="Breadcrumb strip under the top bar"
              checked={shell.breadcrumbs}
              onChange={(breadcrumbs) => setShell({ breadcrumbs })}
            />
            <CheckboxRow
              label="Show menu item icons"
              checked={shell.menuIcons}
              onChange={(menuIcons) => setShell({ menuIcons })}
            />
          </div>
          <PageTransitionField
            value={shell.pageTransition ?? NO_TRANSITION}
            onChange={(pageTransition) => setShell({ pageTransition })}
          />
          <div className="max-w-sm">
            <Field label="Active item text colour (sidebar)">
              <ColorInput
                value={shell.menuActiveColor ?? ''}
                onChange={(menuActiveColor) => setShell({ menuActiveColor })}
                placeholder="Default: the accent's contrast · #fef3c7 · var(--amber-3)"
              />
            </Field>
          </div>
          <div className="max-w-sm">
            <Field label="Locale (formatted table cells)">
              <Input
                value={shell.locale ?? ''}
                onChange={(e) => setShell({ locale: e.target.value })}
                placeholder="Default: the viewer's browser · th-TH · en-GB"
                className="font-mono"
              />
            </Field>
          </div>
          <p className="text-ui-xs text-ink-3">
            In the top bar, groups become dropdowns and there is no sidebar; below the md breakpoint both
            fall back to a drawer. Breadcrumbs follow each page’s parent (Page settings). With icons off, the
            collapsed sidebar rail shows label initials.
          </p>
        </section>

        <SidebarSection shell={shell} menu={menu} pages={pages} setShell={setShell} />

        <section className="mt-3 box space-y-3 p-3">
          <span className="sec-label block">App bar</span>
          <AppBarPreview bar={shell.appBar} title={project.name} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title">
              <Input
                value={shell.appBar.title}
                onChange={(e) => setAppBar({ title: e.target.value })}
                placeholder={project.name}
              />
            </Field>
            <IconField value={shell.appBar.icon} onChange={(icon) => setAppBar({ icon })} />
            <LogoField value={shell.appBar.logo} onChange={(logo) => setAppBar({ logo })} />
            <Field label="Logo size">
              <Input
                value={shell.appBar.logoSize}
                disabled={!shell.appBar.logo}
                onChange={(e) => setAppBar({ logoSize: e.target.value })}
                placeholder="Default: 1.5rem (CSS height; width follows)"
                className="font-mono"
              />
            </Field>
            <div className="space-y-1">
              <span className="text-ui-sm font-medium text-ink-2">Style</span>
              <div>
                <SegmentedControl
                  aria-label="App bar style"
                  options={[
                    { value: 'panel', label: 'Panel' },
                    { value: 'accent', label: 'Accent' },
                    { value: 'custom', label: 'Custom' },
                  ]}
                  value={shell.appBar.variant}
                  onChange={(v) => setAppBar({ variant: v as AppBarSettings['variant'] })}
                />
              </div>
            </div>
            <Field label="Padding">
              <Input
                value={shell.appBar.padding}
                onChange={(e) => setAppBar({ padding: e.target.value })}
                placeholder="Default: 0 0.75rem (CSS padding)"
                className="font-mono"
              />
            </Field>
          </div>
          {shell.appBar.variant === 'custom' && (
            <div className="space-y-3 rounded-md border border-line bg-panel-2 p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Colour">
                  <ColorInput
                    value={shell.appBar.background}
                    disabled={shell.appBar.gradient.enabled}
                    onChange={(background) => setAppBar({ background })}
                    placeholder="#0f766e · rgb(…) · var(--teal-9)"
                  />
                </Field>
                <Field label="Text colour">
                  <Select
                    value={shell.appBar.foreground}
                    onChange={(v) => setAppBar({ foreground: v as AppBarSettings['foreground'] })}
                    options={[
                      { value: '', label: 'Auto (from the colour)' },
                      { value: 'light', label: 'Light' },
                      { value: 'dark', label: 'Dark' },
                    ]}
                  />
                </Field>
              </div>
              <CheckboxRow
                label="Gradient"
                checked={shell.appBar.gradient.enabled}
                onChange={(enabled) => setAppBar({ gradient: { ...shell.appBar.gradient, enabled } })}
              />
              {shell.appBar.gradient.enabled && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="From">
                    <ColorInput
                      value={shell.appBar.gradient.from}
                      onChange={(from) => setAppBar({ gradient: { ...shell.appBar.gradient, from } })}
                      placeholder="#0f766e"
                    />
                  </Field>
                  <Field label="To">
                    <ColorInput
                      value={shell.appBar.gradient.to}
                      onChange={(to) => setAppBar({ gradient: { ...shell.appBar.gradient, to } })}
                      placeholder="#1d4ed8"
                    />
                  </Field>
                  <Field label="Angle (deg)">
                    <Input
                      type="number"
                      min={0}
                      max={360}
                      step={1}
                      value={shell.appBar.gradient.angle}
                      onChange={(e) => setAppBar({ gradient: { ...shell.appBar.gradient, angle: Number(e.target.value) || 0 } })}
                    />
                  </Field>
                </div>
              )}
              <p className="text-ui-xs text-ink-3">
                A custom bar is painted with the colour, or the gradient from → to when enabled (both stops
                needed). Buttons, links and the user menu on it use the text colour — picked from the paint’s
                brightness unless set.
              </p>
            </div>
          )}
          <p className="text-ui-xs text-ink-3">
            The bar across the top of the exported app: its title and mark (an uploaded logo is stored in the
            project as a data URL), on the neutral panel, painted in the theme accent, or a custom colour /
            gradient. The collapse button and its glyphs are set in the Sidebar section.
            Exported as <span className="font-mono">shell.appBar</span> in menu.ts.
          </p>
        </section>

        <div className="mt-5">
          <ItemList items={menu} onChange={set} />
        </div>
        {unwired > 0 && (
          <div className="mt-3">
            <WiringHint>
              {unwired === 1 ? 'One page link has' : `${unwired} page links have`} no page picked — they
              are left out of menu.ts.
            </WiringHint>
          </div>
        )}

        <section className="mt-8">
          <span className="sec-label mb-2 block">In the project JSON</span>
          <CodeViewer
            maxHeightClassName="max-h-[50vh]"
            tabs={[{ id: 'menu', label: 'menu + shell', language: 'json', code: menuJson }]}
          />
        </section>
      </div>
    </div>
  )
}
