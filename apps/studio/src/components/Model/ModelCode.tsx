import { useMemo } from 'react'
import { CodeViewer } from '../common'
import { useLibraryScope, useScopedModels } from '../Library'
import { toModelJson } from './serialize'

/** Right pane: the live `TModelMaster` — the `model` slice of the runtime project JSON. */
export function ModelCode() {
  const scope = useLibraryScope()
  const models = useScopedModels()

  const json = useMemo(() => toModelJson(models), [models])

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-line bg-panel">
      <div className="flex h-[37px] shrink-0 items-center border-b border-line px-3">
        <h2 className="sec-label">{scope === 'project' ? 'model — this project' : 'model — whole library'}</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <CodeViewer
          maxHeightClassName="max-h-[calc(100vh-8rem)]"
          tabs={[
            { id: 'json', label: 'model (project JSON)', language: 'json', code: json },
          ]}
        />
      </div>
    </aside>
  )
}
