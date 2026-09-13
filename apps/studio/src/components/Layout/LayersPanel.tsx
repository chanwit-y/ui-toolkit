import { cn } from '../common'
import { COMPONENT_BY_TYPE } from './componentCatalog'
import { useGridStore, type PathSeg } from './gridStore'
import type { ChildCanvas, GridItemData, TabConfig } from './types'

/** Serialize a drill-in path so two paths compare by value. */
const pathKey = (path: PathSeg[]) => path.map((s) => `${s.itemId}:${s.canvasIndex}`).join('/')

/**
 * The Layers tab: the whole canvas tree, root first, with every container's
 * child canvases expanded inline (a tab lists one group per tab header). Each
 * row shows the cell's type icon, label, and its column span at the preview
 * breakpoint. Clicking a row jumps the editor to that row's canvas and selects
 * the cell — the one place you can cross canvases without the breadcrumb.
 */
export function LayersPanel() {
  const items = useGridStore((s) => s.items)
  const activePath = useGridStore((s) => s.activePath)
  const selectedItemId = useGridStore((s) => s.selectedItemId)
  const previewBreakpoint = useGridStore((s) => s.previewBreakpoint)
  const goToCanvas = useGridStore((s) => s.goToCanvas)

  const activeKey = pathKey(activePath)

  const renderCanvas = (canvas: ChildCanvas, path: PathSeg[]): React.ReactNode => {
    if (canvas.items.length === 0) {
      return path.length === 0 ? (
        <p className="px-4 py-8 text-center text-ui text-ink-3">No elements yet.</p>
      ) : (
        <p className="px-1.5 py-1 text-ui-xs text-ink-3">empty</p>
      )
    }
    return canvas.items.map((item) => renderItem(item, path))
  }

  const renderItem = (item: GridItemData, path: PathSeg[]) => {
    const def = COMPONENT_BY_TYPE[item.type]
    const Icon = def?.icon
    const isCurrent = selectedItemId === item.id && pathKey(path) === activeKey
    const span = item.settings.colSpan[previewBreakpoint]
    const canvases = item.childCanvases ?? []
    const tabs = item.type === 'tab' && item.config ? (item.config as TabConfig).tabs : null

    return (
      <div key={item.id}>
        <button
          type="button"
          aria-current={isCurrent || undefined}
          onClick={() => goToCanvas(path, item.id)}
          className={cn('list-row w-full text-left', isCurrent && 'font-semibold')}
        >
          {Icon && <Icon className="h-[13px] w-[13px] shrink-0 text-ink-3" aria-hidden="true" />}
          <span className="min-w-0 flex-1 truncate">
            {def?.label ?? item.type}
            {item.label && item.label !== def?.label && (
              <span className="text-ink-3"> · {item.label}</span>
            )}
          </span>
          <span className="font-mono text-ui-xs text-ink-3">{span}</span>
        </button>
        {canvases.length > 0 && (
          <div className="ml-2 border-l border-line pl-2">
            {canvases.map((canvas, i) => (
              <div key={i}>
                {tabs && (
                  <span className="sec-label block px-1.5 pb-0.5 pt-1.5 normal-case tracking-normal">
                    {tabs[i]?.label || tabs[i]?.value || `Tab ${i + 1}`}
                  </span>
                )}
                {renderCanvas(canvas, [...path, { itemId: item.id, canvasIndex: i }])}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-2">
      <span className="sec-label block px-1 pb-1.5 pt-1">Canvas</span>
      {renderCanvas({ items, settings: useGridStore.getState().containerSettings }, [])}
    </div>
  )
}
