import { useEffect } from 'react'
import { useGridStore } from './gridStore'

/** True when the key press belongs to a text control — leave its native undo alone. */
function isEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el?.closest?.('input, textarea, select, [contenteditable="true"], [contenteditable=""]')
}

/**
 * Cmd/Ctrl+Z undoes and Cmd/Ctrl+Shift+Z (or Ctrl+Y) redoes the canvas while
 * the layout editor is mounted — the history is per page (see the grilled
 * design), so the listener comes and goes with the editor.
 */
export function useUndoShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      const key = e.key.toLowerCase()
      const isUndo = key === 'z' && !e.shiftKey
      const isRedo = (key === 'z' && e.shiftKey) || (key === 'y' && !e.metaKey)
      if (!isUndo && !isRedo) return
      if (isEditable(e.target)) return
      e.preventDefault()
      const { undo, redo } = useGridStore.getState()
      if (isUndo) undo()
      else redo()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])
}
