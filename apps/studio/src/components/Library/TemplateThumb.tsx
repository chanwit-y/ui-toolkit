import { cn } from '../common'
import { COMPONENT_BY_TYPE } from '../Layout/componentCatalog'
import type { GridItemData } from '../Layout/types'
import type { PageGrid } from '../Workspace/types'

/** Rough block height per kind so a thumbnail reads as the page it stands for. */
function blockHeight(item: GridItemData): number {
  switch (item.type) {
    case 'datatable':
    case 'datatableeditable':
      return 46
    case 'hero':
    case 'barchart':
    case 'linechart':
    case 'piechart':
    case 'people':
    case 'orgchart':
    case 'gallery':
    case 'video':
    case 'image':
      return 34
    case 'container':
    case 'paper':
    case 'card':
    case 'tab':
      return 30
    case 'typography':
    case 'divider':
    case 'spacer':
      return 8
    default:
      return 14
  }
}

/**
 * A wireframe of a template's page grid (the mockup's `tplThumb`): every
 * root block at its lg span, taller for tables and charts, dashed for
 * containers, so the card is recognisable at a glance. Modals and
 * click-only overlays are not on the page, so they are left out.
 */
export function TemplateThumb({ grid, className }: { grid: PageGrid; className?: string }) {
  const cols = grid.containerSettings.columns.lg || 12
  const blocks = grid.items.filter(
    (i) =>
      i.type !== 'modal' &&
      i.type !== 'popover' &&
      !((i.type === 'toast' || i.type === 'dialog') && (i.config as { trigger?: string })?.trigger === 'button'),
  )
  return (
    <div
      className={cn(
        'grid w-full gap-1 overflow-hidden rounded-md border border-line bg-surface p-2',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      aria-hidden="true"
    >
      {blocks.length === 0 && (
        <span className="col-span-full py-4 text-center text-ui-xs text-ink-3">Empty</span>
      )}
      {blocks.map((item) => {
        const isHost = !!item.childCanvases?.length
        const def = COMPONENT_BY_TYPE[item.type]
        return (
          <span
            key={item.id}
            title={def?.label ?? item.type}
            className={cn(
              'block rounded-[3px] border',
              isHost
                ? 'border-dashed border-line-strong bg-panel'
                : item.type === 'button'
                  ? 'border-accent bg-accent'
                  : 'border-line bg-panel-2',
            )}
            style={{
              gridColumn: `span ${Math.min(cols, Math.max(1, item.settings.colSpan.lg))}`,
              height: blockHeight(item),
            }}
          />
        )
      })}
    </div>
  )
}
