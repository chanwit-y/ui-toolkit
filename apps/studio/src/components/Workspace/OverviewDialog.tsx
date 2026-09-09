import { Modal } from '@gummy-ui/ui'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../common'
import { useProjectEndpoints } from '../Library/scope'
import { indexItems, pageLinks } from '../Layout/pageLinks'
import { pageEndpointNames, pageItemCount } from './exportFiles'
import type { PageDef, ProjectDef } from './types'
import { useWorkspaceStore } from './workspaceStore'

const NW = 222
const CG = 112
const RG = 18
const PAD = 2
const H_PAGE = 82
const H_PAGE_API = 112
const H_ACT = 32
const ACT_GAP = 9
const ACT_STEP = 37
const R = 9

type Act = { kind: 'toast' | 'dialog' | 'link'; name: string; via: string; note: string }
type Node = {
  key: string
  kind: 'page' | 'link'
  id: string
  name: string
  sub: string
  empty: boolean
  chips: string[]
  acts: Act[]
  h: number
  blockH: number
  depth: number
  kids: Node[]
  via?: string
  x: number
  y: number
}

const KIND_HUE: Record<string, number> = { page: 212, link: 220, toast: 152, dialog: 320 }

/**
 * "See the whole project" (the mockup's overview): every page as a card,
 * pages laid out as a tree by which button leads where (edge labels carry
 * the button), with the toasts / dialogs / links a page's buttons trigger
 * hanging under it. Clicking a page card opens it in the editor.
 */
export function OverviewDialog({ project, onClose }: { project: ProjectDef; onClose: () => void }) {
  const endpoints = useProjectEndpoints()
  const activePageId = useWorkspaceStore((s) => s.activePageId)
  const navigate = useNavigate()
  const pages = project.snapshot.pages

  const { flat, edges, width, height } = useMemo(() => {
    const byId = new Map(pages.map((p) => [p.id, p]))
    const seen = new Set<string>()

    const mkPage = (pg: PageDef, depth: number): Node => {
      const chips = pageEndpointNames(pg, endpoints)
      const els = pageItemCount(pg)
      const items = indexItems(pg.grid.items)
      const acts: Act[] = pageLinks(pg)
        .filter((l) => l.kind !== 'page')
        .map((l) => {
          if (l.kind === 'link') return { kind: 'link', name: l.href, via: l.via, note: 'link' }
          const target = items.get(l.targetItemId)
          const c = target?.config as { title?: string; person?: string; variant?: string } | undefined
          return {
            kind: l.kind,
            name: (c?.variant === 'Person' ? c.person : c?.title) || target?.label || l.kind,
            via: l.via,
            note: c?.variant ? String(c.variant).toLowerCase() : l.kind,
          }
        })
      const h = chips.length ? H_PAGE_API : H_PAGE
      return {
        key: `p${pg.id}`,
        kind: 'page',
        id: pg.id,
        name: pg.name,
        empty: els === 0,
        sub: els ? `${els} element${els === 1 ? '' : 's'}` : 'nothing on it yet',
        chips,
        acts,
        h,
        blockH: h + (acts.length ? ACT_GAP + acts.length * ACT_STEP - 4 : 0),
        depth,
        kids: [],
        x: 0,
        y: 0,
      }
    }

    const build = (pg: PageDef, depth: number, guard: number): Node => {
      seen.add(pg.id)
      const n = mkPage(pg, depth)
      if (guard >= 6) return n
      for (const l of pageLinks(pg)) {
        if (l.kind !== 'page') continue
        const t = byId.get(l.pageId)
        if (!t) continue
        if (seen.has(t.id)) {
          n.kids.push({
            key: `r${l.buttonId}${n.key}`,
            kind: 'link',
            id: t.id,
            name: t.name,
            sub: 'opened from another page',
            empty: false,
            chips: [],
            acts: [],
            h: H_PAGE,
            blockH: H_PAGE,
            depth: depth + 1,
            kids: [],
            via: l.via,
            x: 0,
            y: 0,
          })
        } else {
          const c = build(t, depth + 1, guard + 1)
          c.via = l.via
          n.kids.push(c)
        }
      }
      return n
    }

    const targeted = new Set<string>()
    for (const pg of pages) for (const l of pageLinks(pg)) if (l.kind === 'page') targeted.add(l.pageId)
    const trees: Node[] = []
    for (const pg of pages) if (!targeted.has(pg.id) && !seen.has(pg.id)) trees.push(build(pg, 0, 0))
    for (const pg of pages) if (!seen.has(pg.id)) trees.push(build(pg, 0, 0))

    const flat: Node[] = []
    const edges: { a: Node; b: Node; label: string }[] = []
    let cursor = PAD
    let maxDepth = 0
    const place = (n: Node) => {
      n.x = n.depth * (NW + CG)
      if (n.depth > maxDepth) maxDepth = n.depth
      if (!n.kids.length) {
        n.y = cursor
        cursor += n.blockH + RG
      } else {
        const top = cursor
        n.kids.forEach(place)
        const f = n.kids[0]
        const l = n.kids[n.kids.length - 1]
        n.y = Math.max(top, Math.round((f.y + f.h / 2 + l.y + l.h / 2 - n.h) / 2))
        if (n.y + n.blockH + RG > cursor) cursor = n.y + n.blockH + RG
      }
      flat.push(n)
      n.kids.forEach((k) => edges.push({ a: n, b: k, label: k.via ?? '' }))
    }
    for (const t of trees) {
      place(t)
      cursor += 14
    }
    return {
      flat,
      edges,
      width: maxDepth * (NW + CG) + NW + PAD,
      height: Math.max(90, cursor),
    }
  }, [pages, endpoints])

  const actCount = flat.reduce((n, x) => n + x.acts.length, 0)

  const edgePath = (e: { a: Node; b: Node }) => {
    const x1 = e.a.x + NW
    const y1 = Math.round(e.a.y + e.a.h / 2)
    const x2 = e.b.x
    const y2 = Math.round(e.b.y + e.b.h / 2)
    const mx = x1 + Math.round((x2 - x1) / 2)
    if (Math.abs(y2 - y1) < 2) return `M${x1} ${y1} H${x2}`
    const sg = y2 > y1 ? 1 : -1
    return `M${x1} ${y1} H${mx - R} Q${mx} ${y1} ${mx} ${y1 + sg * R} V${y2 - sg * R} Q${mx} ${y2} ${mx + R} ${y2} H${x2}`
  }

  const open = (pageId: string) => {
    onClose()
    navigate(`/p/${project.id}/pages/${pageId}`)
  }

  return (
    <Modal
      id="studio-overview"
      open
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
      title={`${project.name} — whole project`}
      description={`${pages.length} page(s) · ${edges.length} page jump(s) · ${actCount} action(s) · ${endpoints.length} endpoint(s)`}
      width="min(94vw, 1180px)"
    >
      <div className="mb-3 flex flex-wrap items-center gap-4 pt-1 text-ui-sm text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <i className="block w-[22px] border-t-2 border-line-strong" /> page to page
        </span>
        {(['page', 'dialog', 'toast', 'link'] as const).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <i
              className="block h-[11px] w-[11px] rounded-[3px] border"
              style={{
                borderStyle: k === 'page' ? 'solid' : 'dashed',
                borderColor: `hsl(${KIND_HUE[k]} 55% 50% / 0.4)`,
                background: `hsl(${KIND_HUE[k]} 65% 50% / 0.18)`,
              }}
            />
            {k === 'page' ? 'page' : `${k} action`}
          </span>
        ))}
        <span className="flex-1" />
        <span>click a page card to open it</span>
      </div>

      <div className="relative max-h-[58vh] overflow-auto rounded-[10px] border border-line bg-sunken p-6">
        <div className="relative" style={{ width, height }}>
          <svg width={width} height={height} className="pointer-events-none absolute left-0 top-0">
            <defs>
              <marker id="ov-arrow" markerWidth="7" markerHeight="7" refX="6.5" refY="3.5" orient="auto">
                <path d="M0 0l7 3.5L0 7z" fill="var(--line-strong)" />
              </marker>
            </defs>
            {edges.map((e, i) => (
              <path
                key={i}
                d={edgePath(e)}
                fill="none"
                stroke="var(--line-strong)"
                strokeWidth={1.6}
                markerEnd="url(#ov-arrow)"
              />
            ))}
          </svg>
          {edges
            .filter((e) => e.label)
            .map((e, i) => {
              const x1 = e.a.x + NW
              const y1 = Math.round(e.a.y + e.a.h / 2)
              const y2 = Math.round(e.b.y + e.b.h / 2)
              const mx = x1 + Math.round((e.b.x - x1) / 2)
              const straight = Math.abs(y2 - y1) < 2
              return (
                <div
                  key={i}
                  className="absolute z-[2] max-w-[150px] -translate-x-1/2 -translate-y-1/2 truncate rounded bg-sunken px-1.5 py-px font-mono text-[10px] text-ink-2"
                  style={{ left: mx, top: straight ? y1 - 13 : Math.round((y1 + y2) / 2) }}
                >
                  {e.label}
                </div>
              )
            })}
          {flat.map((n) => {
            const hue = KIND_HUE[n.kind]
            const isPage = n.kind === 'page'
            return (
              <div key={n.key}>
                <button
                  type="button"
                  onClick={() => open(n.id)}
                  className={cn(
                    'absolute box-border overflow-hidden rounded-[11px] border px-[13px] py-[11px] text-left shadow-[0_1px_2px_rgba(16,18,22,.05)] transition-colors',
                    !isPage && 'border-dashed bg-panel',
                    n.empty && 'border-dashed',
                    n.id === activePageId && 'ring-2 ring-focus',
                  )}
                  style={{
                    left: n.x,
                    top: n.y,
                    width: NW,
                    height: n.h,
                    ...(isPage
                      ? {
                          borderColor: `hsl(${hue} 55% 50% / 0.34)`,
                          background: `hsl(${hue} 65% 50% / 0.05)`,
                        }
                      : {}),
                  }}
                >
                  <span
                    className="mb-1.5 inline-flex h-[15px] items-center rounded px-1.5 font-mono text-[9px] uppercase tracking-[0.06em]"
                    style={{
                      background: `hsl(${hue} 60% 50% / 0.16)`,
                      color: `hsl(${hue} 55% 36%)`,
                      border: `1px solid hsl(${hue} 55% 50% / 0.28)`,
                    }}
                  >
                    {n.kind}
                  </span>
                  <b className="block truncate text-[13px] font-[650] tracking-[-0.01em] text-ink">{n.name}</b>
                  <em className="mt-0.5 block font-mono text-[11px] not-italic text-ink-3">
                    {n.sub}
                    {n.acts.length > 0 && ` · ${n.acts.length} action${n.acts.length === 1 ? '' : 's'}`}
                  </em>
                  {n.chips.length > 0 && (
                    <span className="mt-2 flex gap-1 overflow-hidden">
                      {n.chips.slice(0, 2).map((c) => (
                        <span key={c} className="tag block min-w-0 truncate">
                          {c}
                        </span>
                      ))}
                      {n.chips.length > 2 && <span className="tag">+{n.chips.length - 2}</span>}
                    </span>
                  )}
                </button>
                {n.acts.length > 0 && (
                  <>
                    <div
                      className="absolute border-l border-dashed border-line-strong"
                      style={{
                        left: n.x + 16,
                        top: n.y + n.h,
                        height: ACT_GAP + (n.acts.length - 1) * ACT_STEP + H_ACT / 2,
                      }}
                    />
                    {n.acts.map((a, i) => {
                      const ah = KIND_HUE[a.kind] ?? 220
                      return (
                        <div
                          key={`${n.key}-a${i}`}
                          title={`${a.name} — ${a.kind}, from “${a.via}”`}
                          className="absolute box-border flex h-8 items-center gap-2 overflow-hidden rounded-lg border border-dashed px-[11px] text-[11.5px]"
                          style={{
                            left: n.x + 26,
                            top: n.y + n.h + ACT_GAP + i * ACT_STEP,
                            width: NW - 26,
                            borderColor: `hsl(${ah} 55% 50% / 0.45)`,
                            background: `hsl(${ah} 65% 50% / 0.07)`,
                          }}
                        >
                          <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: `hsl(${ah} 58% 48%)` }} />
                          <span className="min-w-0 flex-1 truncate font-semibold text-ink">{a.name}</span>
                          <span className="whitespace-nowrap font-mono text-[9.5px] text-ink-3">{a.kind}</span>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
