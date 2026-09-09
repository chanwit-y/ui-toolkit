import { useEffect } from 'react'
import { useApiStore } from '../Api/apiStore'
import { MODEL_REF_KEYS } from '../Api/types'
import { Select } from '../common'
import { useGroupStore, useLibraryScope, useScopedModels } from '../Library'
import { FieldTree } from './FieldTree'
import { ModelCode } from './ModelCode'
import { ModelList } from './ModelList'
import { useModelStore } from './modelStore'

/**
 * The Model page — a visual editor for the engine's `model` config
 * (`TModelMaster`). Three panes: the model list (left), the selected model's
 * recursive field tree (center), and the live code export (right). Models are
 * the shared library's (see the grilled Shared library design): inside a
 * project the list is derived from the attached endpoints' references, on the
 * portal's library page it is the whole library.
 */
export function ModelEditor() {
  const scope = useLibraryScope()
  const models = useScopedModels()
  const selectedModelId = useModelStore((s) => s.selectedModelId)
  const selectModel = useModelStore((s) => s.selectModel)
  const setModelGroup = useModelStore((s) => s.setModelGroup)
  const groups = useGroupStore((s) => s.groups)
  const usedBy = useApiStore((s) =>
    s.endpoints
      .filter((e) => MODEL_REF_KEYS.some((k) => e[k] === selectedModelId))
      .map((e) => e.name || '(unnamed)')
      .join(', '),
  )

  // Keep the library-wide selection inside the scope.
  const selected = models.find((m) => m.id === selectedModelId) ?? models[0] ?? null
  useEffect(() => {
    if (selected && selected.id !== selectedModelId) selectModel(selected.id)
  }, [selected, selectedModelId, selectModel])

  const groupOptions = [
    { value: '', label: '(ungrouped)' },
    ...groups.map((g) => ({ value: g.id, label: g.name })),
  ]

  return (
    <div className="flex min-h-0 flex-1 bg-surface">
      <ModelList />

      <div className="flex min-h-0 flex-1 flex-col bg-surface">
        {selected ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h2 className="font-mono text-base font-[650] text-ink">
                {selected.name || <span className="italic text-ink-3">unnamed</span>}
              </h2>
              <div className="w-44">
                <Select
                  aria-label="Group"
                  options={groupOptions}
                  value={selected.groupId ?? ''}
                  onChange={(value) => setModelGroup(selected.id, value || null)}
                />
              </div>
              <span className="text-ui-sm text-ink-3">
                {usedBy ? `Reached through ${usedBy}` : 'No endpoint references this model yet'}
                {scope === 'project' && ' · shared, edits apply everywhere'}
              </span>
            </div>
            {/* Keyed by model id so the single-edit UI state resets when you
                switch models. (Rename the model by double-clicking it in the
                sidebar list.) */}
            <FieldTree key={selected.id} modelId={selected.id} fields={selected.fields} />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-ui text-ink-3">
            {scope === 'project'
              ? 'This project has no model yet — models arrive through the endpoints it attaches.'
              : 'Add a model to get started.'}
          </div>
        )}
      </div>

      <ModelCode />
    </div>
  )
}
