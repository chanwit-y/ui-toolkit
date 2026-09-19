import { useCallback, useMemo, useRef, useState } from 'react'
import { IconData } from '@gummy-ui/ui'
import { Ban, X } from 'lucide-react'
import { cn } from './cn'
import { IconButton } from './IconButton'
import { Input } from './Input'
import { Popover } from './Popover'

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
      <div className="grid max-h-40 grid-cols-6 gap-1 overflow-y-auto rounded-lg border border-line bg-panel p-1.5">
        <button
          type="button"
          title="No icon"
          onClick={() => onChange('')}
          className={cn(
            'flex h-8 items-center justify-center rounded-md transition-colors',
            value === ''
              ? 'bg-panel-2 text-ink ring-1 ring-focus/30'
              : 'text-ink-3 hover:bg-panel-2 hover:text-ink-2',
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
                  ? 'bg-panel-2 text-ink ring-1 ring-focus/30'
                  : 'text-ink-3 hover:bg-panel-2 hover:text-ink-2',
              )}
            >
              <Glyph size={16} aria-hidden="true" />
            </button>
          )
        })}
        {keys.length === 0 && (
          <p className="col-span-6 py-2 text-center text-ui-sm text-ink-3">
            No icons match “{filter}”
          </p>
        )}
      </div>
      <p className="text-ui-sm text-ink-3">
        {value ? (
          <>
            Selected: <span className="font-mono text-ink-3">{value}</span>
          </>
        ) : (
          'No icon'
        )}
      </p>
    </div>
  )
}

/**
 * An `IconData` key as a visible field (menu items, the app bar, select-family
 * icons):
 * the trigger shows the current glyph and key and opens the shared
 * `IconPicker` in a popover (the grid is too tall to sit inline once a menu
 * has a handful of items); the × clears it.
 */
export function IconField({
  value,
  onChange,
  label = 'Icon',
  placeholder = 'No icon — click to choose',
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  label?: string
  placeholder?: string
  disabled?: boolean
}) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const close = useCallback(() => setAnchor(null), [])
  // The popover closes itself on any outside pointerdown — including one on
  // this trigger — so the click that follows must not reopen it.
  const wasOpen = useRef(false)
  const known = !!value && value in IconData
  const Glyph = known ? IconData[value as keyof typeof IconData] : null
  return (
    <div className={cn('block space-y-1', disabled && 'opacity-50')}>
      <span className="text-ui-sm font-medium text-ink-2">{label}</span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label={`Choose ${label.toLowerCase()}`}
          aria-haspopup="dialog"
          aria-expanded={anchor !== null}
          disabled={disabled}
          onPointerDown={() => {
            wasOpen.current = anchor !== null
          }}
          onClick={(e) => {
            if (!wasOpen.current) setAnchor(e.currentTarget.getBoundingClientRect())
          }}
          className="field flex min-w-0 flex-1 items-center gap-2 text-left hover:bg-panel-2"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-panel-2 text-ink">
            {Glyph ? <Glyph size={14} aria-hidden="true" /> : <Ban size={13} className="text-ink-3" aria-hidden="true" />}
          </span>
          {value ? (
            <span className={cn('truncate font-mono', known ? 'text-ink' : 'text-danger')}>
              {value}
              {!known && ' (unknown key)'}
            </span>
          ) : (
            <span className="truncate text-ink-3">{placeholder}</span>
          )}
        </button>
        {value && !disabled && (
          <IconButton label={`Clear ${label.toLowerCase()}`} className="btn-icon-sm" onClick={() => onChange('')}>
            <X size={13} aria-hidden="true" />
          </IconButton>
        )}
      </div>
      <Popover anchor={anchor} title="Icon" onClose={close}>
        <IconPicker
          value={value}
          onChange={(icon) => {
            onChange(icon)
            close()
          }}
        />
      </Popover>
    </div>
  )
}
