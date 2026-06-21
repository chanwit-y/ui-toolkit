import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from './cn'

type PopoverProps = {
  anchor: DOMRect | null
  title: string
  onClose: () => void
  children: ReactNode
}

type PopoverPanelProps = {
  anchor: DOMRect
  title: string
  onClose: () => void
  children: ReactNode
}

function PopoverPanel({ anchor, title, onClose, children }: PopoverPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (panelRef.current?.contains(e.target as Node)) return
      onClose()
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const margin = 12
  const panelWidth = 320
  const maxHeight = Math.min(480, window.innerHeight - margin * 2)
  let top = anchor.bottom + margin
  let left = anchor.left

  if (top + maxHeight > window.innerHeight - margin) {
    top = Math.max(margin, anchor.top - maxHeight - margin)
  }
  if (left + panelWidth > window.innerWidth - margin) {
    left = window.innerWidth - panelWidth - margin
  }
  left = Math.max(margin, left)

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={title}
      className={cn(
        'fixed z-50 flex w-80 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl',
        'transition duration-200 ease-out motion-reduce:transition-none',
        entered
          ? 'translate-y-0 scale-100 opacity-100'
          : '-translate-y-2 scale-110 opacity-0',
      )}
      style={{ top, left, maxHeight, transformOrigin: 'top left' }}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-3 py-2.5">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
          aria-label="Close"
        >
          Esc
        </button>
      </header>
      <div className="overflow-y-auto p-3">{children}</div>
    </div>
  )
}

export function Popover({ anchor, title, onClose, children }: PopoverProps) {
  if (!anchor) return null

  const anchorKey = `${anchor.left},${anchor.top},${anchor.right},${anchor.bottom}`

  return (
    <PopoverPanel key={anchorKey} anchor={anchor} title={title} onClose={onClose}>
      {children}
    </PopoverPanel>
  )
}
