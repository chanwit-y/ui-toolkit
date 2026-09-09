import { Modal } from '@gummy-ui/ui'
import { Boxes, LayoutGrid, Moon, Pencil, Plug, Plus, Search, Sun, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { AppearanceSync } from '../AppearanceSync'
import { Button, cn, ConfirmDialog, IconButton, Input } from '../common'
import { useLibraryUiStore } from '../Library/libraryUiStore'
import { attachedEndpoints, countComponents, referencedModels } from './snapshots'
import type { ProjectDef } from './types'
import { useWorkspaceStore } from './workspaceStore'

/** "just now" / "5m ago" / "3h ago" / "2d ago". */
function timeAgo(ts: number): string {
  const s = (Date.now() - ts) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const RAIL_ITEM =
  'flex h-[30px] w-full items-center gap-2 rounded-md px-2 text-left text-ui font-medium text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink aria-[current=page]:bg-panel-2 aria-[current=page]:font-semibold aria-[current=page]:text-ink'

/**
 * The workspace chrome (the mockup's portal): topbar with brand, search and
 * the appearance toggle, and the rail — WORKSPACE › Projects, SHARED LIBRARY ›
 * APIs / Models, Reset demo data. Pages mount into the Outlet.
 */
export function PortalLayout() {
  const projectCount = useWorkspaceStore((s) => s.projects.length)
  const endpointCount = useWorkspaceStore((s) => s.library.endpoints.length)
  const modelCount = useWorkspaceStore((s) => s.library.models.length)
  const appearance = useWorkspaceStore((s) => s.appearance)
  const setAppearance = useWorkspaceStore((s) => s.setAppearance)
  const query = useLibraryUiStore((s) => s.query)
  const setQuery = useLibraryUiStore((s) => s.setQuery)
  const [confirmReset, setConfirmReset] = useState(false)

  const isDark = appearance === 'dark'

  return (
    <>
      <AppearanceSync appearance={appearance} />
      <header className="flex h-[46px] shrink-0 items-center gap-2.5 border-b border-line bg-panel px-3">
        <div className="flex items-center gap-2 pr-1 text-[13px] font-[650] tracking-[-0.01em] text-ink">
          <span
            aria-hidden="true"
            className="grid h-[22px] w-[22px] place-items-center rounded-md bg-accent font-mono text-[12px] font-bold text-accent-ink"
          >
            G
          </span>
          Gummy Studio
        </div>
        <div className="relative ml-4 w-[280px]">
          <Search
            className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            aria-label="Search"
            className="pl-7"
          />
        </div>
        <div className="flex-1" />
        <IconButton
          label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={() => setAppearance(isDark ? 'light' : 'dark')}
        >
          {isDark ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
        </IconButton>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav className="flex w-[214px] shrink-0 flex-col gap-0.5 overflow-auto border-r border-line bg-panel px-2 py-3">
          <span className="sec-label px-2 pb-1 pt-2.5 text-[10px] tracking-[0.07em]">Workspace</span>
          <NavLink to="/" end className={RAIL_ITEM}>
            <LayoutGrid size={15} aria-hidden="true" className="text-ink-3" />
            <span className="flex-1">Projects</span>
            <span className="font-mono text-ui-xs text-ink-3">{projectCount}</span>
          </NavLink>
          <span className="sec-label px-2 pb-1 pt-2.5 text-[10px] tracking-[0.07em]">Shared library</span>
          <NavLink to="/library/apis" className={RAIL_ITEM}>
            <Plug size={15} aria-hidden="true" className="text-ink-3" />
            <span className="flex-1">APIs</span>
            <span className="font-mono text-ui-xs text-ink-3">{endpointCount}</span>
          </NavLink>
          <NavLink to="/library/models" className={RAIL_ITEM}>
            <Boxes size={15} aria-hidden="true" className="text-ink-3" />
            <span className="flex-1">Models</span>
            <span className="font-mono text-ui-xs text-ink-3">{modelCount}</span>
          </NavLink>
          <hr className="mx-1 my-2.5 border-0 border-t border-line" />
          <button type="button" onClick={() => setConfirmReset(true)} className={RAIL_ITEM}>
            <Trash2 size={13} aria-hidden="true" className="text-ink-3" />
            <span className="flex-1">Reset demo data</span>
          </button>
        </nav>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface">
          <Outlet />
        </main>
      </div>

      {confirmReset && (
        <ConfirmDialog
          title="Reset demo data?"
          body="Every project and the whole shared library in this browser are replaced by the seeded Country manager example."
          confirmLabel="Reset"
          onConfirm={() => {
            useWorkspaceStore.getState().resetDemo()
            setConfirmReset(false)
          }}
          onClose={() => setConfirmReset(false)}
        />
      )}
    </>
  )
}

type DialogState = { kind: 'create' } | { kind: 'edit'; project: ProjectDef } | { kind: 'delete'; project: ProjectDef } | null

/** The Projects page: a searchable project list and the New project dialog.
 * Opening a row navigates into the studio at `/p/:id`. */
export function ProjectsPage() {
  const projects = useWorkspaceStore((s) => s.projects)
  const query = useLibraryUiStore((s) => s.query)
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<DialogState>(null)

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return projects
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
    )
  }, [projects, query])

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto max-w-[1060px] px-6 pb-16 pt-6">
        <div className="mb-4 flex items-end gap-3.5">
          <div>
            <h1 className="text-[21px] font-[650] tracking-[-0.02em] text-ink">Projects</h1>
            <p className="mt-0.5 text-ui text-ink-2">
              Screens are assembled here. Endpoints come from the shared library — a project
              attaches them and owns its canvas, env and theme. Everything saves locally as you work.
            </p>
          </div>
          <div className="flex-1" />
          <Button variant="primary" onClick={() => setDialog({ kind: 'create' })}>
            <Plus size={14} aria-hidden="true" />
            New project
          </Button>
        </div>

        {list.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-line-strong px-6 py-10 text-center text-ui text-ink-2">
            <b className="mb-1 block text-[13.5px] text-ink">
              {query ? 'Nothing matches that search.' : 'No projects yet.'}
            </b>
            {query ? 'Clear it, or start a new project.' : 'Create one to open the studio.'}
          </div>
        ) : (
          <div className="overflow-hidden rounded-[10px] border border-line bg-surface">
            {list.map((p) => (
              <ProjectRow
                key={p.id}
                project={p}
                onOpen={() => navigate(`/p/${p.id}`)}
                onEdit={() => setDialog({ kind: 'edit', project: p })}
                onDelete={() => setDialog({ kind: 'delete', project: p })}
              />
            ))}
          </div>
        )}
      </div>

      {(dialog?.kind === 'create' || dialog?.kind === 'edit') && (
        <ProjectDialog
          project={dialog.kind === 'edit' ? dialog.project : undefined}
          onClose={() => setDialog(null)}
          onCreated={(id) => {
            setDialog(null)
            navigate(`/p/${id}`)
          }}
        />
      )}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          title={`Delete “${dialog.project.name}”?`}
          body="The project's canvas, env and theme are removed from this browser. Library endpoints and models stay. There is no undo."
          confirmLabel="Delete project"
          onConfirm={() => {
            useWorkspaceStore.getState().deleteProject(dialog.project.id)
            setDialog(null)
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}

function ProjectRow({
  project,
  onOpen,
  onEdit,
  onDelete,
}: {
  project: ProjectDef
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const updateProject = useWorkspaceStore((s) => s.updateProject)
  const library = useWorkspaceStore((s) => s.library)
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const snapshotName = useRef('')

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const beginEdit = () => {
    snapshotName.current = project.name
    setEditing(true)
  }
  const commit = () => setEditing(false)
  const cancel = () => {
    updateProject(project.id, { name: snapshotName.current })
    setEditing(false)
  }

  const { snapshot } = project
  const endpoints = attachedEndpoints(snapshot.endpointIds, library.endpoints)
  const models = referencedModels(endpoints, library.models)
  const components = countComponents(snapshot.grid.items)
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
  const meta = `${plural(endpoints.length, 'endpoint')} · ${plural(models.length, 'model')} · ${plural(components, 'component')}`

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (!editing) onOpen()
      }}
      onKeyDown={(e) => {
        if (!editing && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onOpen()
        }
      }}
      className={cn(
        'group flex cursor-pointer items-center gap-3.5 border-b border-line px-3.5 py-[11px] transition-colors last:border-b-0 hover:bg-panel',
        editing && 'cursor-default',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {editing ? (
            <input
              ref={inputRef}
              value={project.name}
              onChange={(e) => updateProject(project.id, { name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commit()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  cancel()
                }
              }}
              onBlur={commit}
              onClick={(e) => e.stopPropagation()}
              aria-label="Project name"
              className="field h-6 w-64"
            />
          ) : (
            <b
              onDoubleClick={(e) => {
                e.stopPropagation()
                beginEdit()
              }}
              title="Double-click to rename"
              className="text-[13.5px] font-semibold text-ink"
            >
              {project.name}
            </b>
          )}
          {endpoints.length === 0 && <span className="tag">no API yet</span>}
        </div>
        {project.description && (
          <div className="mt-0.5 truncate text-ui text-ink-2">{project.description}</div>
        )}
        <div className="mt-1 font-mono text-ui-sm text-ink-3">{meta}</div>
      </div>
      <span className="font-mono text-ui-sm text-ink-3">Updated {timeAgo(project.updatedAt)}</span>
      <IconButton
        label={`Edit ${project.name}`}
        className="btn-icon-sm h-6! text-ink-3 hover:text-ink"
        onClick={(e) => {
          e.stopPropagation()
          onEdit()
        }}
      >
        <Pencil size={12} aria-hidden="true" />
      </IconButton>
      <IconButton
        label={`Delete ${project.name}`}
        className="btn-icon-sm h-6! text-ink-3 hover:text-danger"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        <Trash2 size={12} aria-hidden="true" />
      </IconButton>
    </div>
  )
}

/** New project / edit project — the library Modal, form inside. */
function ProjectDialog({
  project,
  onClose,
  onCreated,
}: {
  project?: ProjectDef
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const createProject = useWorkspaceStore((s) => s.createProject)
  const updateProject = useWorkspaceStore((s) => s.updateProject)
  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [fromSeed, setFromSeed] = useState(true)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (project) {
      updateProject(project.id, { name: name.trim() || project.name, description })
      onClose()
    } else {
      const created = createProject({ name, description, fromSeed })
      onCreated(created.id)
    }
  }

  return (
    <Modal
      id={project ? `studio-project-edit-${project.id}` : 'studio-project-new'}
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={project ? 'Project details' : 'New project'}
      description={
        project
          ? 'Rename the project or change what it is for.'
          : 'A project owns one screen, its env and theme, and attaches endpoints from the shared library.'
      }
      width="460px"
    >
      <form onSubmit={submit} className="space-y-3 pt-2 text-ink">
        <label className="block">
          <span className="mb-1 block text-ui-sm font-medium text-ink-2">Project name</span>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Billing portal"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-ui-sm font-medium text-ink-2">What is it for?</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="One line your team will recognise later."
            className="field field-area"
          />
        </label>
        {!project && (
          <label className="flex cursor-pointer items-center gap-2 text-ui text-ink">
            <input
              type="checkbox"
              checked={fromSeed}
              onChange={(e) => setFromSeed(e.target.checked)}
              className="h-3.5 w-3.5 accent-accent"
            />
            Start from the countries example (the canvas, with the country endpoints attached
            from the library)
          </label>
        )}
        <div className="flex justify-end gap-2 border-t border-line pt-3">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {project ? 'Save' : 'Create project'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
