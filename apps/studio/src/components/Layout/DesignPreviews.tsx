import {
  ArrowUpRight,
  Clapperboard,
  GalleryHorizontal,
  Image as ImageIcon,
  Link2,
} from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { cn } from '../common'
import {
  commaList,
  imageList,
  initials,
  lineItems,
  ratioPadding,
  type AlertConfig,
  type BannerConfig,
  type ChartConfig,
  type GalleryConfig,
  type HeroConfig,
  type ImageConfig,
  type LinkCardConfig,
  type OrgChartConfig,
  type PeopleConfig,
  type ProgressConfig,
  type QuickLinksConfig,
  type SpacerConfig,
  type StatConfig,
  type VideoConfig,
} from './designTypes'
import type { GridItemData } from './types'

/**
 * Canvas renders for the design-only types — the mockup's design HTML as
 * React + tokens. They paint with the studio's ink tokens (`--ink`, `--panel-2`,
 * `--accent`, `--line`, `--r`) so a cell's Style-tab colours re-tint them.
 * Inert by construction: nothing here handles clicks (the cell owns selection).
 */

const RADIUS: CSSProperties = { borderRadius: 'var(--r, 6px)' }

function Title({ children }: { children: ReactNode }) {
  if (!children) return null
  return <div className="mb-2 text-ui font-semibold text-ink">{children}</div>
}

function Caption({ children }: { children: ReactNode }) {
  if (!children) return null
  return <div className="mt-1.5 text-ui-xs text-ink-3">{children}</div>
}

/** A fixed-ratio media box with an optional placeholder message. */
function MediaBox({
  ratio,
  children,
  placeholder,
}: {
  ratio: Parameters<typeof ratioPadding>[0]
  children?: ReactNode
  placeholder?: ReactNode
}) {
  return (
    <div
      className="relative w-full overflow-hidden border border-line bg-panel-2"
      style={{ paddingTop: ratioPadding(ratio), ...RADIUS }}
    >
      <div className="absolute inset-0">{children}</div>
      {placeholder && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-3 text-center text-ui-xs text-ink-3">
          {placeholder}
        </div>
      )}
    </div>
  )
}

export function HeroPreview({ config }: { config: HeroConfig }) {
  const hasImage = !!config.bgImage
  return (
    <div
      className={cn(
        'relative flex w-full overflow-hidden border border-line bg-panel-2 p-6',
        config.align === 'center' ? 'items-center justify-center text-center' : 'items-center',
      )}
      style={{
        minHeight: `${config.height || 200}px`,
        ...RADIUS,
        ...(hasImage
          ? {
              backgroundImage: `url(${config.bgImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : {}),
      }}
    >
      {hasImage && (
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-black"
          style={{ opacity: (config.overlay || 0) / 100 }}
        />
      )}
      <div className={cn('relative max-w-[36rem]', hasImage ? 'text-white' : 'text-ink')}>
        <h3 className="m-0 text-[20px] font-[650] leading-tight tracking-[-0.01em]">{config.title}</h3>
        {config.subtitle && (
          <p className={cn('mb-0 mt-1.5 text-ui', hasImage ? 'text-white/80' : 'text-ink-2')}>
            {config.subtitle}
          </p>
        )}
        {config.cta && (
          <span
            className={cn(
              'mt-3.5 inline-flex h-8 items-center px-3.5 text-ui font-semibold',
              hasImage ? 'bg-white text-[#111]' : 'bg-accent text-accent-ink',
            )}
            style={RADIUS}
          >
            {config.cta}
          </span>
        )}
      </div>
    </div>
  )
}

export function ImagePreview({ config }: { config: ImageConfig }) {
  return (
    <div className="w-full">
      <MediaBox
        ratio={config.ratio}
        placeholder={
          config.url ? undefined : (
            <>
              <ImageIcon size={18} aria-hidden="true" />
              <span>No image yet — paste a URL in the inspector</span>
            </>
          )
        }
      >
        {config.url && (
          <img
            src={config.url}
            alt={config.alt}
            className={cn('h-full w-full', config.fit === 'contain' ? 'object-contain' : 'object-cover')}
          />
        )}
      </MediaBox>
      <Caption>{config.caption}</Caption>
    </div>
  )
}

export function GalleryPreview({ config }: { config: GalleryConfig }) {
  const imgs = imageList(config.images)
  return (
    <div className="w-full">
      <MediaBox
        ratio={config.ratio}
        placeholder={
          imgs.length ? undefined : (
            <>
              <GalleryHorizontal size={18} aria-hidden="true" />
              <span>Add image URLs, one per line</span>
            </>
          )
        }
      >
        {imgs[0] && <img src={imgs[0]} alt="" className="h-full w-full object-cover" />}
      </MediaBox>
      {imgs.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5">
          {imgs.map((_, i) => (
            <i
              key={i}
              className={cn('block h-1.5 w-1.5 rounded-full', i === 0 ? 'bg-ink' : 'bg-line-strong')}
            />
          ))}
        </div>
      )}
      {config.thumbs && imgs.length > 1 && (
        <div className="mt-2 flex gap-1.5 overflow-hidden">
          {imgs.map((u) => (
            <i
              key={u}
              className="block h-9 w-12 shrink-0 border border-line bg-panel-2 bg-cover bg-center"
              style={{ backgroundImage: `url(${u})`, ...RADIUS }}
            />
          ))}
        </div>
      )}
      <Caption>{config.caption}</Caption>
    </div>
  )
}

export function VideoPreview({ config }: { config: VideoConfig }) {
  return (
    <div className="w-full">
      <MediaBox
        ratio={config.ratio}
        placeholder={
          <>
            <Clapperboard size={18} aria-hidden="true" />
            <span className="max-w-full truncate">
              {config.url || 'Paste a video URL in the inspector'}
            </span>
          </>
        }
      />
      <Caption>{config.caption}</Caption>
    </div>
  )
}

export function LinkCardPreview({ config }: { config: LinkCardConfig }) {
  return (
    <div
      className="flex w-full items-center gap-2.5 border border-line bg-panel px-3 py-2.5"
      style={RADIUS}
    >
      <Link2 size={15} aria-hidden="true" className="shrink-0 text-ink-3" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-ui font-semibold text-ink">{config.title}</span>
        {config.description && (
          <span className="block truncate text-ui-xs text-ink-2">{config.description}</span>
        )}
        <span className="block truncate font-mono text-ui-xs text-ink-3">{config.url}</span>
      </span>
      <ArrowUpRight size={14} aria-hidden="true" className="shrink-0 text-ink-3" />
    </div>
  )
}

export function QuickLinksPreview({ config }: { config: QuickLinksConfig }) {
  const items = lineItems(config.items)
  return (
    <div className="w-full">
      <Title>{config.title}</Title>
      <div className="flex flex-col gap-1">
        {items.map((it, i) => (
          <div
            key={`${it.a}-${i}`}
            className="flex items-center gap-2 border border-line bg-panel px-2.5 py-1.5 text-ui text-ink"
            style={RADIUS}
          >
            <Link2 size={13} aria-hidden="true" className="shrink-0 text-ink-3" />
            <span className="min-w-0 flex-1 truncate">{it.a}</span>
            <ArrowUpRight size={13} aria-hidden="true" className="shrink-0 text-ink-3" />
          </div>
        ))}
        {items.length === 0 && (
          <span className="text-ui-xs text-ink-3">No links yet — add `Label | URL` lines.</span>
        )}
      </div>
    </div>
  )
}

export function SpacerPreview({ config }: { config: SpacerConfig }) {
  const h = config.height || 24
  return (
    <div
      className="flex w-full items-center justify-center border border-dashed border-line text-ui-xs text-ink-3"
      style={{ height: `${h}px`, ...RADIUS }}
    >
      {h}px
    </div>
  )
}

/* -------------------------------------------------------------- charts */

const SAMPLE_VALUES = [42, 31, 24, 18, 13, 9, 7, 5, 3]

function chartItems(config: ChartConfig): { label: string; value: number }[] {
  const labels = commaList(config.sample)
  return labels.map((label, i) => ({ label, value: SAMPLE_VALUES[i % SAMPLE_VALUES.length] }))
}

function chartColors(config: ChartConfig, count: number): string[] {
  const custom = commaList(config.palette)
  return Array.from({ length: count }, (_, i) =>
    custom.length
      ? custom[i % custom.length]
      : `color-mix(in srgb, var(--accent) ${Math.max(24, 96 - i * 13)}%, var(--bg))`,
  )
}

export function ChartPreview({ config }: { config: ChartConfig }) {
  const items = chartItems(config)
  const colors = chartColors(config, items.length)
  const max = Math.max(1, ...items.map((i) => i.value))
  const total = items.reduce((a, b) => a + b.value, 0) || 1

  let body: ReactNode
  if (items.length === 0) {
    body = <div className="py-6 text-center text-ui-xs text-ink-3">No data to plot.</div>
  } else if (config.chartType === 'Column') {
    body = (
      <div className="flex h-[120px] items-stretch gap-1.5">
        {items.map((it, i) => (
          <div key={it.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="font-mono text-ui-xs text-ink-3">{it.value}</span>
            {/* The bar is a % of this track, which has a definite height. */}
            <div className="relative w-full flex-1">
              <i
                className="absolute inset-x-0 bottom-0 block rounded-t-sm"
                style={{ height: `${Math.max(2, (it.value / max) * 100)}%`, background: colors[i] }}
              />
            </div>
            <span className="w-full truncate text-center text-ui-xs text-ink-3">{it.label}</span>
          </div>
        ))}
      </div>
    )
  } else if (config.chartType === 'Bar') {
    body = (
      <div className="flex flex-col gap-1.5">
        {items.map((it, i) => (
          <div key={it.label} className="flex items-center gap-2 text-ui-xs">
            <span className="w-20 truncate text-ink-2">{it.label}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-sm bg-panel-2">
              <i
                className="block h-full"
                style={{ width: `${Math.max(2, (it.value / max) * 100)}%`, background: colors[i] }}
              />
            </span>
            <span className="w-6 text-right font-mono text-ink-3">{it.value}</span>
          </div>
        ))}
      </div>
    )
  } else if (config.chartType === 'Line' || config.chartType === 'Area') {
    const W = 320
    const H = 120
    const pad = 8
    const step = items.length > 1 ? (W - pad * 2) / (items.length - 1) : 0
    const pts = items.map((it, i) => [pad + i * step, H - pad - (it.value / max) * (H - pad * 2)])
    const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
    body = (
      <>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[130px] w-full" preserveAspectRatio="none">
          {config.chartType === 'Area' && (
            <polygon
              points={`${pad},${H - pad} ${line} ${pad + (items.length - 1) * step},${H - pad}`}
              fill={colors[0]}
              opacity={0.25}
            />
          )}
          <polyline
            points={line}
            fill="none"
            stroke={colors[0]}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {pts.map((p, i) => (
            <circle key={i} cx={p[0].toFixed(1)} cy={p[1].toFixed(1)} r={2.6} fill={colors[0]} />
          ))}
        </svg>
        <div className="mt-0.5 flex justify-between text-ui-xs text-ink-3">
          {items.map((it) => (
            <span key={it.label}>{it.label}</span>
          ))}
        </div>
      </>
    )
  } else {
    const R = 54
    const C = 60
    const inner = config.chartType === 'Donut' ? 30 : 0
    let a0 = -Math.PI / 2
    const paths = items.map((it, i) => {
      const a1 = a0 + (it.value / total) * Math.PI * 2
      const large = a1 - a0 > Math.PI ? 1 : 0
      const x0 = C + R * Math.cos(a0)
      const y0 = C + R * Math.sin(a0)
      const x1 = C + R * Math.cos(a1)
      const y1 = C + R * Math.sin(a1)
      let d: string
      if (inner) {
        const xi0 = C + inner * Math.cos(a1)
        const yi0 = C + inner * Math.sin(a1)
        const xi1 = C + inner * Math.cos(a0)
        const yi1 = C + inner * Math.sin(a0)
        d = `M${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} L${xi0},${yi0} A${inner},${inner} 0 ${large} 0 ${xi1},${yi1} Z`
      } else {
        d = `M${C},${C} L${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} Z`
      }
      a0 = a1
      return <path key={it.label} d={d} fill={colors[i]} />
    })
    body = (
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 120 120" className="h-[120px] w-[120px] shrink-0">
          {items.length === 1 ? (
            <circle cx={C} cy={C} r={R} fill={colors[0]} />
          ) : (
            paths
          )}
          {inner > 0 && <circle cx={C} cy={C} r={inner} fill="var(--bg)" />}
        </svg>
        <div className="flex min-w-0 flex-col gap-1">
          {items.map((it, i) => (
            <div key={it.label} className="flex items-center gap-1.5 text-ui-xs text-ink-2">
              <i className="block h-2 w-2 rounded-sm" style={{ background: colors[i] }} />
              <span className="truncate">{it.label}</span>
              <span className="font-mono text-ink-3">{Math.round((it.value / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <Title>{config.title}</Title>
      {body}
      {config.endpointId == null && items.length > 0 && (
        <Caption>Sample data — bind an endpoint in the inspector.</Caption>
      )}
    </div>
  )
}

/* -------------------------------------------------------------- people */

export function PeoplePreview({ config }: { config: PeopleConfig }) {
  const list = lineItems(config.items)
  return (
    <div className="w-full">
      <Title>{config.title}</Title>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-2">
        {list.map((p, i) => (
          <div
            key={`${p.a}-${i}`}
            className="flex items-center gap-2 border border-line bg-panel px-2 py-1.5"
            style={RADIUS}
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent font-mono text-ui-xs font-semibold text-accent-ink">
              {initials(p.a)}
            </span>
            <span className="min-w-0 leading-tight">
              <b className="block truncate text-ui font-semibold text-ink">{p.a}</b>
              <em className="block truncate text-ui-xs not-italic text-ink-3">{p.b}</em>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function OrgChartPreview({ config }: { config: OrgChartConfig }) {
  const items = lineItems(config.items)
  const roots = items.filter((x) => x.depth === 0)
  const kids = items.filter((x) => x.depth === 1)
  const box = (x: { a: string; b: string }, i: number) => (
    <div
      key={`${x.a}-${i}`}
      className="min-w-[8rem] border border-line bg-panel px-2.5 py-1.5 text-center leading-tight"
      style={RADIUS}
    >
      <b className="block truncate text-ui font-semibold text-ink">{x.a}</b>
      <span className="block truncate text-ui-xs text-ink-3">{x.b}</span>
    </div>
  )
  return (
    <div className="w-full">
      <Title>{config.title}</Title>
      <div className="flex flex-col items-center gap-0">
        {roots.length > 0 && <div className="flex flex-wrap justify-center gap-2">{roots.map(box)}</div>}
        {kids.length > 0 && (
          <>
            <i aria-hidden="true" className="block h-4 w-px bg-line-strong" />
            <div className="flex flex-wrap justify-center gap-2">{kids.map(box)}</div>
          </>
        )}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- data */

export function StatPreview({ config }: { config: StatConfig }) {
  return (
    <div className="w-full border border-line bg-panel px-3 py-2.5" style={RADIUS}>
      <div className="text-ui-xs font-medium text-ink-3">{config.label}</div>
      <div className="mt-0.5 text-[22px] font-[650] leading-tight tracking-[-0.02em] text-ink">
        {config.value}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ feedback */

export function AlertPreview({ config }: { config: AlertConfig }) {
  return (
    <div className="flex w-full gap-2.5 border border-line bg-panel p-3" style={RADIUS}>
      <span aria-hidden="true" className="block w-[3px] shrink-0 rounded-full bg-warn" />
      <div className="min-w-0 text-ui leading-snug">
        <b className="font-semibold text-ink">{config.title}</b>
        {config.action && <u className="ml-2 text-ink-3">{config.action}</u>}
        <span className="block text-ink-2">{config.body}</span>
      </div>
    </div>
  )
}

export function BannerPreview({ config }: { config: BannerConfig }) {
  return (
    <div
      className="flex w-full items-center gap-3 bg-accent px-3.5 py-2 text-ui text-accent-ink"
      style={RADIUS}
    >
      <span className="min-w-0 flex-1 truncate">{config.text}</span>
      {config.action && <u className="shrink-0 font-semibold">{config.action}</u>}
    </div>
  )
}

export function ProgressPreview({ config }: { config: ProgressConfig }) {
  const v = Math.max(0, Math.min(100, Number(config.value) || 0))
  return (
    <div className="w-full">
      <div className="mb-1.5 text-ui-xs font-medium text-ink-2">
        {config.label} · {v}%
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-panel-2">
        <div className="h-full bg-accent" style={{ width: `${v}%` }} />
      </div>
    </div>
  )
}

/**
 * The one seam for design-only canvas renders: the design for `item`, or null
 * when the item is not a design-only type (see the grilled design — a real
 * component replaces a branch here when the library gains it).
 */
export function renderDesignPreview(item: GridItemData): ReactNode {
  const c = item.config
  if (!c) return null
  switch (item.type) {
    case 'hero':
      return <HeroPreview config={c as HeroConfig} />
    case 'image':
      return <ImagePreview config={c as ImageConfig} />
    case 'gallery':
      return <GalleryPreview config={c as GalleryConfig} />
    case 'video':
      return <VideoPreview config={c as VideoConfig} />
    case 'linkcard':
      return <LinkCardPreview config={c as LinkCardConfig} />
    case 'quicklinks':
      return <QuickLinksPreview config={c as QuickLinksConfig} />
    case 'spacer':
      return <SpacerPreview config={c as SpacerConfig} />
    case 'barchart':
    case 'linechart':
    case 'piechart':
      return <ChartPreview config={c as ChartConfig} />
    case 'people':
      return <PeoplePreview config={c as PeopleConfig} />
    case 'orgchart':
      return <OrgChartPreview config={c as OrgChartConfig} />
    case 'stat':
      return <StatPreview config={c as StatConfig} />
    case 'alert':
      return <AlertPreview config={c as AlertConfig} />
    case 'banner':
      return <BannerPreview config={c as BannerConfig} />
    case 'progress':
      return <ProgressPreview config={c as ProgressConfig} />
    default:
      return null
  }
}
