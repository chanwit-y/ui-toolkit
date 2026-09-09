import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cn, IconButton, Input, Select } from '../common'
import { useLibraryUiStore } from '../Library/libraryUiStore'
import type { ActivityKind } from './types'
import { Avatar } from './UserButton'
import { useActivity, useWorkspaceStore } from './workspaceStore'

/** "just now" / "5m ago" / "3h ago" / "2d ago". */
function timeAgo(ts: number): string {
  const s = (Date.now() - ts) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

/** The mockup's hue-derived kind chips — one stable colour per kind. */
const KIND_HUE: Record<ActivityKind, number> = {
  project: 222,
  page: 186,
  api: 212,
  model: 270,
  template: 36,
  group: 152,
  theme: 320,
}

function KindTag({ kind }: { kind: ActivityKind }) {
  const h = KIND_HUE[kind]
  return (
    <span
      className="tag font-sans font-semibold"
      style={{
        background: `hsl(${h} 65% 50% / 0.13)`,
        color: `hsl(${h} 58% 36%)`,
        borderColor: `hsl(${h} 60% 50% / 0.3)`,
      }}
    >
      {kind}
    </span>
  )
}

const KINDS: { value: 'all' | ActivityKind; label: string }[] = [
  { value: 'all', label: 'Everything' },
  { value: 'project', label: 'Projects' },
  { value: 'page', label: 'Pages' },
  { value: 'group', label: 'Groups' },
  { value: 'api', label: 'APIs' },
  { value: 'model', label: 'Models' },
  { value: 'template', label: 'Templates' },
  { value: 'theme', label: 'Theme' },
]

function inRange(ts: number, from: string, to: string): boolean {
  if (from && ts < new Date(`${from}T00:00:00`).getTime()) return false
  if (to && ts > new Date(`${to}T23:59:59`).getTime()) return false
  return true
}

/**
 * The portal's Activity page (the mockup's `activityPage`): who changed what
 * across every project and the shared library, filtered by kind chips, a
 * person, a date range and the topbar search.
 */
export function ActivityPage() {
  const activity = useActivity()
  const projects = useWorkspaceStore((s) => s.projects)
  const query = useLibraryUiStore((s) => s.query)
  const [kind, setKind] = useState<'all' | ActivityKind>('all')
  const [who, setWho] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const users = useMemo(() => [...new Set(activity.map((a) => a.user))], [activity])
  const projectName = (id: string | null) => (id ? projects.find((p) => p.id === id)?.name : undefined)

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return activity.filter((a) => {
      if (kind !== 'all' && a.kind !== kind) return false
      if (who !== 'all' && a.user !== who) return false
      if (!inRange(a.ts, from, to)) return false
      if (!q) return true
      return `${a.name} ${a.user} ${a.verb} ${a.detail} ${projectName(a.projectId) ?? ''}`
        .toLowerCase()
        .includes(q)
    })
  }, [activity, kind, who, from, to, query, projects]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto max-w-[1060px] px-6 pb-16 pt-6">
        <div className="mb-4">
          <h1 className="text-[21px] font-[650] tracking-[-0.02em] text-ink">Activity</h1>
          <p className="mt-0.5 text-ui text-ink-2">
            Who changed what, across every project and the shared library.
          </p>
        </div>

        <div className="mb-3.5 flex flex-wrap items-center gap-2">
          <div className="w-44">
            <Select
              aria-label="Person"
              options={[{ value: 'all', label: 'Everyone' }, ...users.map((u) => ({ value: u, label: u }))]}
              value={who}
              onChange={setWho}
            />
          </div>
          <div className="flex items-center gap-1.5 text-ui-sm text-ink-3">
            <span>From</span>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[132px]" aria-label="From date" />
            <span>to</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[132px]" aria-label="To date" />
            {(from || to) && (
              <IconButton
                label="Clear dates"
                className="btn-icon-sm h-6!"
                onClick={() => {
                  setFrom('')
                  setTo('')
                }}
              >
                <X size={12} aria-hidden="true" />
              </IconButton>
            )}
          </div>
          <span className="flex-1" />
          <span className="font-mono text-ui-xs text-ink-3">
            {list.length} of {activity.length}
          </span>
        </div>

        <div className="mb-3.5 flex flex-wrap gap-1.5">
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              aria-pressed={kind === k.value}
              onClick={() => setKind(k.value)}
              className={cn(
                'h-[26px] rounded-full border px-[11px] text-[12px] transition-colors',
                kind === k.value
                  ? 'border-accent bg-accent font-semibold text-accent-ink'
                  : 'border-line bg-surface text-ink-2 hover:border-line-strong',
              )}
            >
              {k.label}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-line-strong px-6 py-10 text-center text-ui text-ink-2">
            <b className="mb-1 block text-[13.5px] text-ink">No activity matches those filters.</b>
            Clear the search, the person or the dates.
          </div>
        ) : (
          <div className="overflow-hidden rounded-[10px] border border-line bg-surface">
            {list.slice(0, 200).map((a) => {
              const pj = projectName(a.projectId)
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-2.5 border-b border-line px-3 py-[9px] text-ui last:border-b-0"
                >
                  <Avatar name={a.user} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5 text-ink">
                      <b className="font-semibold">{a.user}</b> {a.verb} <KindTag kind={a.kind} />{' '}
                      <span className="truncate">{a.name}</span>
                      {pj && <span className="text-ink-3">in {pj}</span>}
                    </span>
                    {a.detail && (
                      <span className="mt-0.5 block truncate font-mono text-ui-sm text-ink-3">{a.detail}</span>
                    )}
                  </span>
                  <span className="whitespace-nowrap font-mono text-[11px] text-ink-3">{timeAgo(a.ts)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
