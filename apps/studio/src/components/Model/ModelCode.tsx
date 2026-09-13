import { useMemo } from 'react'
import { CodeViewer } from '../common'
import { useLibraryScope, useScopedModels } from '../Library'
import { toModelJson, toModelTs } from './serialize'

/** Right pane: the live `TModelMaster` export — paste-ready TS + raw JSON. */
export function ModelCode() {
  const scope = useLibraryScope()
  const models = useScopedModels()

  const ts = useMemo(() => toModelTs(models), [models])
  const json = useMemo(() => toModelJson(models), [models])

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-line bg-panel">
      <div className="flex h-[37px] shrink-0 items-center border-b border-line px-3">
        <h2 className="sec-label">{scope === 'project' ? 'model.ts — this project' : 'model.ts — whole library'}</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <CodeViewer
          maxHeightClassName="max-h-[calc(100vh-8rem)]"
          tabs={[
            { id: 'ts', label: 'model.ts', language: 'text', code: ts },
            { id: 'json', label: 'JSON', language: 'json', code: json },
          ]}
        />
      </div>
    </aside>
  )
}
