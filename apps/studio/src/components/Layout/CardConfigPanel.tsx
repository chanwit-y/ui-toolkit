import type { ReactNode } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { IconButton, IconPicker, Input, SegmentedControl, SortableCardList } from '../common'
import { NavigateEditor } from './ButtonConfigPanel'
import { EditContentsButton } from './ContainerHostConfigPanel'
import { useGridStore } from './gridStore'
import { ItemBindingField } from './ItemBindingField'
import { useRepeaterScope } from './repeaterScope'
import { IMAGE_KINDS, TEXT_KINDS } from './rowFields'
import {
  BUTTON_VARIANT_OPTIONS,
  createDefaultCardActionConfig,
  createDefaultNavigate,
  type AvatarConfig,
  type ButtonVariant,
  type CardActionConfig,
  type CardConfig,
  type CardHeaderConfig,
  type CardMediaConfig,
} from './types'

/** One labelled row in the config form. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-ui-sm font-medium text-ink-2">{label}</span>
      {children}
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-ui-sm font-medium text-ink-2">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-line-strong text-ink focus:ring-focus/30"
      />
    </label>
  )
}

function Heading({ children }: { children: ReactNode }) {
  return <h3 className="pt-1 text-ui-sm font-semibold uppercase tracking-wide text-ink-3">{children}</h3>
}

const VARIANT_OPTIONS = [
  { value: 'elevation', label: 'Elevation' },
  { value: 'outlined', label: 'Outlined' },
]

const ALIGN_OPTIONS = [
  { value: 'start', label: 'Start' },
  { value: 'end', label: 'End' },
]

const AVATAR_SIZE_OPTIONS = [
  { value: 'xs', label: 'XS' },
  { value: 'sm', label: 'S' },
  { value: 'md', label: 'M' },
  { value: 'lg', label: 'L' },
  { value: 'xl', label: 'XL' },
]

/**
 * The compact editor for a card button (footer action or header action):
 * label / icon / variant plus an optional `Navigate` target. `actions` follows
 * the target (`['Navigate']` while set, else `[]`) so the export is a plain
 * engine button; the row source is offered inside a repeater's template.
 */
function CardActionFields({
  action,
  onChange,
  allowRow,
}: {
  action: CardActionConfig
  onChange: (next: CardActionConfig) => void
  allowRow: boolean
}) {
  const patch = (p: Partial<CardActionConfig>) => onChange({ ...action, ...p })
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Input value={action.label} onChange={(e) => patch({ label: e.target.value })} placeholder="Label (empty = icon only)" />
        <IconPicker value={action.icon} onChange={(v) => patch({ icon: v })} />
      </div>
      <SegmentedControl
        options={BUTTON_VARIANT_OPTIONS}
        value={action.variant}
        onChange={(v) => patch({ variant: v as ButtonVariant })}
        aria-label="Variant"
      />
      <Toggle
        label="Go to a page"
        checked={!!action.navigate}
        onChange={(on) => patch(on ? { navigate: createDefaultNavigate(), actions: ['Navigate'] } : { navigate: undefined, actions: [] })}
      />
      {action.navigate && (
        <NavigateEditor value={action.navigate} onChange={(v) => patch({ navigate: v })} allowRow={allowRow} />
      )}
    </div>
  )
}

/** Inspector for a card: its slots (header, media, content, actions, expand), the whole-card link and the Paper surface. */
export function CardConfigPanel({ itemId, config }: { itemId: string; config: CardConfig }) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof CardConfig>(key: K, value: CardConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<CardConfig>)
  const setHeader = <K extends keyof CardHeaderConfig>(key: K, value: CardHeaderConfig[K]) =>
    set('header', { ...config.header, [key]: value })
  const setAvatar = <K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) =>
    setHeader('avatar', { ...config.header.avatar, [key]: value })
  const setMedia = <K extends keyof CardMediaConfig>(key: K, value: CardMediaConfig[K]) =>
    set('media', { ...config.media, [key]: value })
  const scope = useRepeaterScope()
  // The row source only means something inside a repeater's item template.
  const allowRow = scope !== null
  const h = config.header

  const patchAction = (index: number, next: CardActionConfig) =>
    set('actions', config.actions.map((a, i) => (i === index ? next : a)))
  const removeAction = (index: number) => set('actions', config.actions.filter((_, i) => i !== index))

  return (
    <div className="space-y-3">
      <Heading>Card</Heading>
      <Field label="Name">
        <Input value={config.name} onChange={(e) => set('name', e.target.value)} className="font-mono" />
      </Field>

      <Heading>Header</Heading>
      <Field label={h.titleBinding ? 'Title (fallback)' : 'Title'}>
        <Input value={h.title} onChange={(e) => setHeader('title', e.target.value)} />
      </Field>
      <ItemBindingField label="Title" binding={h.titleBinding} onChange={(b) => setHeader('titleBinding', b)} scope={scope} kinds={TEXT_KINDS} />
      <Field label={h.subheaderBinding ? 'Subheader (fallback)' : 'Subheader'}>
        <Input value={h.subheader} onChange={(e) => setHeader('subheader', e.target.value)} />
      </Field>
      <ItemBindingField label="Subheader" binding={h.subheaderBinding} onChange={(b) => setHeader('subheaderBinding', b)} scope={scope} kinds={TEXT_KINDS} />

      <Toggle label="Avatar" checked={h.avatarEnabled} onChange={(v) => setHeader('avatarEnabled', v)} />
      {h.avatarEnabled && (
        <div className="space-y-2 rounded-lg border border-line bg-panel p-2">
          <Field label={h.avatar.srcBinding ? 'Image URL (fallback)' : 'Image URL'}>
            <Input value={h.avatar.src} onChange={(e) => setAvatar('src', e.target.value)} placeholder="https://…" />
          </Field>
          <ItemBindingField label="Image URL" binding={h.avatar.srcBinding ?? null} onChange={(b) => setAvatar('srcBinding', b)} scope={scope} kinds={IMAGE_KINDS} />
          <Field label={h.avatar.fallbackBinding ? 'Fallback (when the field is empty)' : 'Fallback (initials)'}>
            <Input value={h.avatar.fallback} onChange={(e) => setAvatar('fallback', e.target.value)} />
          </Field>
          <ItemBindingField label="Fallback" binding={h.avatar.fallbackBinding ?? null} onChange={(b) => setAvatar('fallbackBinding', b)} scope={scope} kinds={TEXT_KINDS} />
          <Field label="Size">
            <SegmentedControl
              options={AVATAR_SIZE_OPTIONS}
              value={h.avatar.size}
              onChange={(v) => setAvatar('size', v as AvatarConfig['size'])}
              aria-label="Avatar size"
            />
          </Field>
        </div>
      )}

      <Toggle label="Action button (end of the header)" checked={h.actionEnabled} onChange={(v) => setHeader('actionEnabled', v)} />
      {h.actionEnabled && (
        <div className="rounded-lg border border-line bg-panel p-2">
          <CardActionFields action={h.action} onChange={(next) => setHeader('action', next)} allowRow={allowRow} />
        </div>
      )}

      <Heading>Media</Heading>
      <Toggle label="Image band" checked={config.media.enabled} onChange={(v) => setMedia('enabled', v)} />
      {config.media.enabled && (
        <div className="space-y-2 rounded-lg border border-line bg-panel p-2">
          <Field label={config.media.srcBinding ? 'Image URL (fallback)' : 'Image URL'}>
            <Input value={config.media.src} onChange={(e) => setMedia('src', e.target.value)} placeholder="https://…" />
          </Field>
          <ItemBindingField label="Image URL" binding={config.media.srcBinding} onChange={(b) => setMedia('srcBinding', b)} scope={scope} kinds={IMAGE_KINDS} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Alt text">
              <Input value={config.media.alt} onChange={(e) => setMedia('alt', e.target.value)} />
            </Field>
            <Field label="Height (px)">
              <Input
                type="number"
                min={40}
                value={String(config.media.height)}
                onChange={(e) => setMedia('height', Math.max(40, Number(e.target.value) || 0))}
              />
            </Field>
          </div>
        </div>
      )}

      <Heading>Content</Heading>
      <EditContentsButton itemId={itemId} canvasIndex={0}>Edit content</EditContentsButton>

      <Heading>Actions</Heading>
      {config.actions.length > 0 && (
        <SortableCardList
          items={config.actions}
          onReorder={(next) => set('actions', next)}
          cardClassName="space-y-2 rounded-lg border border-line bg-panel p-2"
          gripLabel={(_, index) => `Reorder button ${index + 1}`}
        >
          {(action, index, { grip }) => (
            <>
              <div className="flex items-center justify-between gap-2">
                {grip}
                <span className="flex-1 truncate text-ui-sm text-ink-3">{action.label || (action.icon ? `icon: ${action.icon}` : 'Button')}</span>
                <IconButton label={`Remove button ${index + 1}`} onClick={() => removeAction(index)} className="h-6! w-6! text-ink-3 hover:text-danger">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </IconButton>
              </div>
              <CardActionFields action={action} onChange={(next) => patchAction(index, next)} allowRow={allowRow} />
            </>
          )}
        </SortableCardList>
      )}
      <button
        type="button"
        onClick={() => set('actions', [...config.actions, createDefaultCardActionConfig('Button')])}
        className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-line-strong py-1.5 text-ui-sm font-medium text-ink-3 transition-colors hover:border-focus hover:text-ink"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Add button
      </button>
      {config.actions.length > 0 && (
        <Field label="Align">
          <SegmentedControl
            options={ALIGN_OPTIONS}
            value={config.actionsAlign}
            onChange={(v) => set('actionsAlign', v as CardConfig['actionsAlign'])}
            aria-label="Actions alignment"
          />
        </Field>
      )}

      <Heading>Expandable section</Heading>
      <Toggle label="Expand toggle + section" checked={config.collapseEnabled} onChange={(v) => set('collapseEnabled', v)} />
      {config.collapseEnabled && (
        <div className="space-y-2 rounded-lg border border-line bg-panel p-2">
          <EditContentsButton itemId={itemId} canvasIndex={1}>Edit expanded content</EditContentsButton>
          <Field label="Toggle label">
            <Input value={config.collapseLabel} onChange={(e) => set('collapseLabel', e.target.value)} placeholder="Show more" />
          </Field>
          <Toggle label="Open by default" checked={config.defaultExpanded} onChange={(v) => set('defaultExpanded', v)} />
        </div>
      )}

      <Heading>Card click</Heading>
      <Toggle
        label="Go to a page when the card is clicked"
        checked={config.navigate !== null}
        onChange={(on) => set('navigate', on ? createDefaultNavigate() : null)}
      />
      {config.navigate && <NavigateEditor value={config.navigate} onChange={(v) => set('navigate', v)} allowRow={allowRow} />}

      <Heading>Surface</Heading>
      <Field label="Variant">
        <SegmentedControl
          options={VARIANT_OPTIONS}
          value={config.variant}
          onChange={(v) => set('variant', v as CardConfig['variant'])}
          aria-label="Card variant"
        />
      </Field>
      {config.variant === 'elevation' && (
        <Field label="Elevation (0–24)">
          <Input type="number" min={0} max={24} value={String(config.elevation)} onChange={(e) => set('elevation', Number(e.target.value) || 0)} />
        </Field>
      )}
      <Toggle label="Square corners" checked={config.square} onChange={(v) => set('square', v)} />
    </div>
  )
}
