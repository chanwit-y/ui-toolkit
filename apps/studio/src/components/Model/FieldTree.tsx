import {
  Asterisk,
  Braces,
  Brackets,
  Hash,
  Plus,
  ToggleLeft,
  Trash2,
  Type,
} from 'lucide-react'
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from 'react'
import { Input, Select, cn } from '../common'
import { playEnter, playExitThenRemove, playFadeIn } from './animation'
import type { SegmentedOption } from '../common'
import { fieldHasChildren, findField, useModelStore } from './modelStore'
import { PRIMITIVES, type ArrayOf, type FieldKind, type ModelField } from './types'

const KIND_OPTIONS: SegmentedOption[] = [
  ...PRIMITIVES.map((p) => ({ value: p, label: p })),
  { value: 'object', label: 'object' },
  { value: 'array', label: 'array' },
]

// `array of` can be any primitive or an object (nested fields), but not another
// array — the engine's TModelArray.collection is `TModel | string`, so a
// nested array is expressed as `array of object` with an array field inside.
const ARRAY_OF_OPTIONS: SegmentedOption[] = [
  ...PRIMITIVES.map((p) => ({ value: p, label: p })),
  { value: 'object', label: 'object' },
]

/** The type pill text shown in display mode — array element folds into the badge. */
function typeBadge(field: ModelField): string {
  return field.kind === 'array' ? `array<${field.arrayOf}>` : field.kind
}

/**
 * Per-kind icon + tinted-pill classes for the display-mode badge. Keyed by
 * `FieldKind`; arrays use the array color/icon regardless of element type. The
 * pill classes are literal strings (not built at runtime) so Tailwind emits
 * them — see the theming note in CLAUDE.md.
 */
const TYPE_STYLE: Record<
  FieldKind,
  { icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean }>; pill: string }
> = {
  string: { icon: Type, pill: 'bg-blue-50 text-blue-600' },
  number: { icon: Hash, pill: 'bg-amber-50 text-amber-600' },
  integer: { icon: Hash, pill: 'bg-amber-50 text-amber-600' },
  boolean: { icon: ToggleLeft, pill: 'bg-violet-50 text-violet-600' },
  any: { icon: Asterisk, pill: 'bg-zinc-100 text-zinc-500' },
  object: { icon: Braces, pill: 'bg-teal-50 text-teal-600' },
  array: { icon: Brackets, pill: 'bg-indigo-50 text-indigo-600' },
}

/**
 * Single-edit coordination for the whole tree. Only one field row is editable
 * at a time; `beginEdit` snapshots the field so `cancel` (Esc) can restore the
 * full subtree even after a kind-change dropped its children. State is local UI
 * — it lives here, not in the store, and resets when the model is switched
 * (FieldTree is keyed by model id).
 */
type EditingCtx = {
  editingId: string | null
  beginEdit: (modelId: string, field: ModelField) => void
  commit: () => void
  cancel: () => void
}

const EditingContext = createContext<EditingCtx | null>(null)

function useEditing(): EditingCtx {
  const ctx = useContext(EditingContext)
  if (!ctx) throw new Error('useEditing must be used within FieldTree')
  return ctx
}

type FieldRowProps = {
  modelId: string
  field: ModelField
  depth: number
}

function FieldRow({ modelId, field, depth }: FieldRowProps) {
  const renameField = useModelStore((s) => s.renameField)
  const setFieldKind = useModelStore((s) => s.setFieldKind)
  const setFieldArrayOf = useModelStore((s) => s.setFieldArrayOf)
  const deleteField = useModelStore((s) => s.deleteField)
  const addField = useModelStore((s) => s.addField)

  const { editingId, beginEdit, commit, cancel } = useEditing()
  const isEditing = editingId === field.id

  const hasChildren = fieldHasChildren(field.kind, field.arrayOf)
  const isArray = field.kind === 'array'

  const rootRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fade + slide the row in on mount (new field, or a model switch remounting
  // the tree). Reduced motion is honored inside playEnter.
  useEffect(() => {
    playEnter(rootRef.current)
  }, [])

  // Focus + select the name as soon as a row enters edit (incl. brand-new fields).
  useEffect(() => {
    if (isEditing) inputRef.current?.select()
  }, [isEditing])

  // Crossfade the row's content when it swaps between display and edit — but not
  // on the initial mount (the enter animation above already covers that).
  const modeMounted = useRef(false)
  useEffect(() => {
    if (modeMounted.current) playFadeIn(contentRef.current)
    else modeMounted.current = true
  }, [isEditing])

  // Animate the row out, then remove it from the store.
  const handleDelete = () => {
    playExitThenRemove(rootRef.current, () => deleteField(modelId, field.id))
  }

  // Add a nested child, then open it in edit. The new id isn't returned by the
  // store action, so read it back as the last child of this parent.
  const addNested = () => {
    addField(modelId, field.id)
    const parent = findField(
      useModelStore.getState().models.find((m) => m.id === modelId)?.fields ?? [],
      field.id,
    )
    const child = parent?.children.at(-1)
    if (child) beginEdit(modelId, child)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    }
  }

  // Commit when focus leaves the row entirely (click-away / Tab out).
  const onBlur = (e: React.FocusEvent) => {
    if (!contentRef.current?.contains(e.relatedTarget as Node | null)) commit()
  }

  return (
    <div ref={rootRef}>
      {isEditing ? (
        <div
          ref={contentRef}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          className="flex flex-wrap items-center gap-2 py-1"
        >
          {/* Name + type stay paired on one line; array-of + actions may wrap.
              The name input is a fixed, compact width (not flex-1) so edit mode
              reads like the display label — the type control sits right after it
              the way the type badge does, rather than stretching full-width. */}
          <div className="flex min-w-0 items-center gap-2">
            <div className="w-44 max-w-full shrink-0">
              <Input
                ref={inputRef}
                value={field.name}
                onChange={(e) => renameField(modelId, field.id, e.target.value)}
                placeholder="fieldName"
                className="font-mono"
                aria-label="Field name"
              />
            </div>
            {/* Width-constraining wrapper: the shared Select is `w-full` and our
                naive `cn` doesn't tailwind-merge, so sizing the wrapper works
                where a `w-28` on the Select itself would lose to `w-full`. */}
            <div className="w-28 shrink-0">
              <Select
                options={KIND_OPTIONS}
                value={field.kind}
                onChange={(v) => setFieldKind(modelId, field.id, v as FieldKind)}
                aria-label="Field type"
              />
            </div>
          </div>
          {isArray && (
            <div className="w-28 shrink-0">
              <Select
                options={ARRAY_OF_OPTIONS}
                value={field.arrayOf}
                onChange={(v) => setFieldArrayOf(modelId, field.id, v as ArrayOf)}
                aria-label="Array element type"
              />
            </div>
          )}
          {hasChildren && (
            <button
              type="button"
              onClick={addNested}
              title="Add nested field"
              aria-label="Add nested field"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-teal-700"
            >
              <Plus size={15} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            title="Delete field"
            aria-label="Delete field"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div ref={contentRef} className="group flex items-center gap-2 py-1">
          {/* The name occupies the same fixed w-44 column as the edit-mode input
              and the badge sits in the type column — so the type lands at the
              same x in every row and matches edit mode (no shift on toggle). The
              px-2.5 mirrors the Input's padding so the name text aligns too. The
              action buttons follow right after the badge (below), not flexed to
              the far right. */}
          <button
            type="button"
            onClick={() => beginEdit(modelId, field)}
            title="Click to edit"
            className="flex shrink-0 items-center gap-2 rounded-md py-1.5 text-left transition-colors hover:bg-zinc-100"
          >
            <span
              className={cn(
                'w-44 max-w-full shrink-0 truncate px-2.5 font-mono text-sm',
                field.name.trim() ? 'text-zinc-800' : 'italic text-zinc-400',
              )}
            >
              {field.name.trim() || 'unnamed'}
            </span>
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] font-medium',
                TYPE_STYLE[field.kind].pill,
              )}
            >
              {(() => {
                const Icon = TYPE_STYLE[field.kind].icon
                return <Icon size={12} aria-hidden={true} />
              })()}
              {typeBadge(field)}
            </span>
          </button>
          {hasChildren && (
            <button
              type="button"
              onClick={addNested}
              title="Add nested field"
              aria-label="Add nested field"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 opacity-0 transition-opacity hover:bg-zinc-50 hover:text-teal-700 group-hover:opacity-100"
            >
              <Plus size={15} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            title="Delete field"
            aria-label="Delete field"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-400 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </div>
      )}

      {hasChildren && (
        <div className="ml-3 border-l border-zinc-200 pl-3">
          {field.children.length === 0 ? (
            <p className="py-1 text-xs text-zinc-400">
              No nested fields yet — use + to add one.
            </p>
          ) : (
            field.children.map((child) => (
              <FieldRow
                key={child.id}
                modelId={modelId}
                field={child}
                depth={depth + 1}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

type FieldTreeProps = {
  modelId: string
  fields: ModelField[]
}

export function FieldTree({ modelId, fields }: FieldTreeProps) {
  const addField = useModelStore((s) => s.addField)
  const replaceField = useModelStore((s) => s.replaceField)

  const [editingId, setEditingId] = useState<string | null>(null)
  // Snapshot of the field as it was when edit began, for Esc-to-revert.
  const snapshotRef = useRef<{ modelId: string; field: ModelField } | null>(null)

  // Fade the empty-state card in whenever the model becomes (or starts) empty.
  const emptyRef = useRef<HTMLDivElement>(null)
  const isEmpty = fields.length === 0
  useEffect(() => {
    if (isEmpty) playFadeIn(emptyRef.current)
  }, [isEmpty])

  const editing: EditingCtx = {
    editingId,
    beginEdit: (mId, field) => {
      snapshotRef.current = { modelId: mId, field: structuredClone(field) }
      setEditingId(field.id)
    },
    commit: () => {
      snapshotRef.current = null
      setEditingId(null)
    },
    cancel: () => {
      const snap = snapshotRef.current
      if (snap) replaceField(snap.modelId, snap.field.id, snap.field)
      snapshotRef.current = null
      setEditingId(null)
    },
  }

  // Add a root field, then open it in edit (read its id back from the store).
  const addRoot = () => {
    addField(modelId, null)
    const created = useModelStore
      .getState()
      .models.find((m) => m.id === modelId)
      ?.fields.at(-1)
    if (created) editing.beginEdit(modelId, created)
  }

  // First-run empty state: a centered prompt with an explicit labeled CTA, so a
  // freshly created model reads as "start here" rather than a bare line of text.
  // (The persistent toolbar add button below is icon-only and only shows once
  // there are fields, to avoid two competing add affordances.)
  if (isEmpty) {
    return (
      <EditingContext.Provider value={editing}>
        <div
          ref={emptyRef}
          className="flex flex-col items-center justify-center gap-3 py-16 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
            <Braces size={22} aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-zinc-700">No fields yet</h3>
            <p className="max-w-xs text-xs text-zinc-400">
              Add fields to define this model&apos;s shape — each becomes a key in
              the exported config.
            </p>
          </div>
          <button
            type="button"
            onClick={addRoot}
            className="inline-flex items-center gap-1.5 rounded-md border border-teal-600 bg-teal-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
          >
            <Plus size={15} aria-hidden="true" />
            Add field
          </button>
        </div>
      </EditingContext.Provider>
    )
  }

  return (
    <EditingContext.Provider value={editing}>
      {fields.map((f) => (
        <FieldRow key={f.id} modelId={modelId} field={f} depth={0} />
      ))}
      <button
        type="button"
        onClick={addRoot}
        title="Add field"
        aria-label="Add field"
        className="mt-2 inline-flex h-8 w-8 items-center justify-center rounded-md border border-teal-600 bg-teal-600 text-white transition-colors hover:bg-teal-700"
      >
        <Plus size={15} aria-hidden="true" />
      </button>
    </EditingContext.Provider>
  )
}
