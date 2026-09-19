import { IconData } from '@gummy-ui/ui'
import { Plus, Trash2 } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import {
  Button,
  CodeViewer,
  IconButton,
  IconField,
  Input,
  SegmentedControl,
  SortableCardList,
  cn,
} from '../common'
import { NavigateEditor, WiringHint } from '../Layout/ButtonConfigPanel'
import { createMenuItem, toMenuTs } from '../Workspace/menu'
import type { AppBarSettings, MenuItemDef, ShellSettings } from '../Workspace/types'
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
  const menuTs = useMemo(() => toMenuTs(menu, pages, shell), [menu, pages, shell])

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
          <p className="text-ui-xs text-ink-3">
            In the top bar, groups become dropdowns and there is no sidebar; below the md breakpoint both
            fall back to a drawer. Breadcrumbs follow each page’s parent (Page settings). With icons off, the
            collapsed sidebar rail shows label initials.
          </p>
        </section>

        <section className="mt-3 box space-y-3 p-3">
          <span className="sec-label block">App bar</span>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title">
              <Input
                value={shell.appBar.title}
                onChange={(e) => setAppBar({ title: e.target.value })}
                placeholder={project.name}
              />
            </Field>
            <Field label="Logo URL">
              <Input
                value={shell.appBar.logo}
                onChange={(e) => setAppBar({ logo: e.target.value })}
                placeholder="https://… (wins over the icon)"
                className="font-mono"
              />
            </Field>
            <IconField value={shell.appBar.icon} onChange={(icon) => setAppBar({ icon })} />
            <div className="space-y-1">
              <span className="text-ui-sm font-medium text-ink-2">Style</span>
              <div>
                <SegmentedControl
                  aria-label="App bar style"
                  options={[
                    { value: 'panel', label: 'Panel' },
                    { value: 'accent', label: 'Accent' },
                  ]}
                  value={shell.appBar.variant}
                  onChange={(v) => setAppBar({ variant: v as AppBarSettings['variant'] })}
                />
              </div>
            </div>
          </div>
          <CheckboxRow
            label="Collapsible sidebar (show the collapse-to-rail button)"
            checked={shell.collapsible}
            onChange={(collapsible) => setShell({ collapsible })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <IconField
              label="Hide sidebar icon"
              placeholder="Default: chevronLeft"
              disabled={!shell.collapsible}
              value={shell.appBar.sidebarToggle.hide}
              onChange={(hide) => setAppBar({ sidebarToggle: { ...shell.appBar.sidebarToggle, hide } })}
            />
            <IconField
              label="Show sidebar icon"
              placeholder="Default: chevronRight"
              disabled={!shell.collapsible}
              value={shell.appBar.sidebarToggle.show}
              onChange={(show) => setAppBar({ sidebarToggle: { ...shell.appBar.sidebarToggle, show } })}
            />
          </div>
          <p className="text-ui-xs text-ink-3">
            The bar across the top of the exported app: its title and mark, on the neutral panel or painted
            in the theme accent. The sidebar button and its glyphs only apply to the Sidebar placement.
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
          <span className="sec-label mb-2 block">Export</span>
          <CodeViewer
            maxHeightClassName="max-h-[50vh]"
            tabs={[{ id: 'menu', label: 'menu.ts', language: 'text', code: menuTs }]}
          />
        </section>
      </div>
    </div>
  )
}
