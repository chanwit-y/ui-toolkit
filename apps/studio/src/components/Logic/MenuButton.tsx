import { MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '../common'

/** A small menu under a ⋯ button. */
export function MenuButton({ items, label, className }: { items: { label: string; onClick: () => void; danger?: boolean; disabled?: boolean; title?: string }[]; label: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])
  if (!items.length) return null
  return (
    <div ref={wrap} className={cn('relative', className)}>
      <button type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="grid size-6 place-items-center rounded-md text-ink-3 hover:bg-panel-2 hover:text-ink">
        <MoreHorizontal aria-hidden className="size-3.5" />
      </button>
      {open && (
        <ul role="menu" className="absolute right-0 top-full z-50 mt-1 min-w-44 rounded-lg border border-line bg-surface py-1 shadow-xl">
          {items.map((it) => (
            <li key={it.label}>
              <button
                type="button"
                role="menuitem"
                disabled={it.disabled}
                title={it.title}
                onClick={() => {
                  setOpen(false)
                  it.onClick()
                }}
                className={cn('w-full px-2.5 py-1 text-left text-ui-sm hover:bg-panel-2 disabled:cursor-not-allowed disabled:opacity-50', it.danger ? 'text-danger' : 'text-ink-2 hover:text-ink')}
              >
                {it.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
