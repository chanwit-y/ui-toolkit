import { useMemo, useState, type ReactNode } from 'react'
import { IconData } from '@gummy-ui/ui'
import { Ban } from 'lucide-react'
import { cn, Input } from '../common'
import { useGridStore } from './gridStore'
import type { ButtonConfig } from './types'

/** One labelled row in the config form. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      {children}
    </label>
  )
}

const ICON_KEYS = Object.keys(IconData) as (keyof typeof IconData)[]

/**
 * Searchable glyph-grid picker over the library's `IconData` map (the keys the
 * engine `ButtonElement.icon` accepts — see the grilled design: picking a glyph
 * you can see beats typing a key). A filter box narrows the ~110 keys, the grid
 * scrolls, and the leading slot clears the selection. Storing the key (not the
 * component) keeps the config JSON-serializable.
 */
export function IconPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (key: string) => void
}) {
  const [filter, setFilter] = useState('')
  const keys = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return q ? ICON_KEYS.filter((k) => k.toLowerCase().includes(q)) : ICON_KEYS
  }, [filter])

  return (
    <div className="space-y-2">
      <Input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter icons…"
      />
      <div className="grid max-h-40 grid-cols-6 gap-1 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/60 p-1.5">
        <button
          type="button"
          title="No icon"
          onClick={() => onChange('')}
          className={cn(
            'flex h-8 items-center justify-center rounded-md transition-colors',
            value === ''
              ? 'bg-teal-100 text-teal-700 ring-1 ring-teal-400'
              : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600',
          )}
        >
          <Ban className="h-4 w-4" aria-hidden="true" />
        </button>
        {keys.map((key) => {
          const Glyph = IconData[key]
          return (
            <button
              key={key}
              type="button"
              title={key}
              onClick={() => onChange(key)}
              className={cn(
                'flex h-8 items-center justify-center rounded-md transition-colors',
                value === key
                  ? 'bg-teal-100 text-teal-700 ring-1 ring-teal-400'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700',
              )}
            >
              <Glyph size={16} aria-hidden="true" />
            </button>
          )
        })}
        {keys.length === 0 && (
          <p className="col-span-6 py-2 text-center text-xs text-zinc-400">
            No icons match “{filter}”
          </p>
        )}
      </div>
      <p className="text-[11px] text-zinc-400">
        {value ? (
          <>
            Selected: <span className="font-mono text-zinc-500">{value}</span>
          </>
        ) : (
          'No icon'
        )}
      </p>
    </div>
  )
}

/**
 * Editor for a button's config — the visual slice of the engine `ButtonElement`
 * (label + IconData glyph). The behavior (`actions`, `api`, `confirmBox`,
 * snackbars, `modalId`) isn't authorable here: the export emits a skeleton
 * `actions: []` the consumer wires up, and the note below says so.
 */
export function ButtonConfigPanel({
  itemId,
  config,
}: {
  itemId: string
  config: ButtonConfig
}) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof ButtonConfig>(key: K, value: ButtonConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<ButtonConfig>)

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        Button
      </h3>
      <Field label="Label">
        <Input value={config.label} onChange={(e) => set('label', e.target.value)} />
      </Field>
      <Field label="Icon">
        <IconPicker value={config.icon} onChange={(v) => set('icon', v)} />
      </Field>
      <p className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-2 text-[11px] leading-relaxed text-zinc-500">
        Behavior (<span className="font-mono">actions</span>, API, confirm box,
        snackbars) is wired by the consumer — the export emits an empty{' '}
        <span className="font-mono">actions: []</span> skeleton.
      </p>
    </div>
  )
}
