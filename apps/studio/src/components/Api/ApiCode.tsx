import { useMemo } from 'react'
import { CodeViewer } from '../common'
import { useLibraryScope, useScopedEndpoints } from '../Library'
import { useModelStore } from '../Model/modelStore'
import { toApiJson, toApiTs } from './serialize'

/** Right pane: the live `TApiMaster` export — paste-ready TS + raw JSON — of
 * the endpoints in scope (a project's attached set, or the whole library).
 * Model refs resolve against every library model, whatever the scope. */
export function ApiCode() {
  const scope = useLibraryScope()
  const endpoints = useScopedEndpoints()
  const models = useModelStore((s) => s.models)

  const ts = useMemo(() => toApiTs(endpoints, models), [endpoints, models])
  const json = useMemo(() => toApiJson(endpoints, models), [endpoints, models])

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-line bg-panel">
      <div className="flex h-[37px] shrink-0 items-center border-b border-line px-3">
        <h2 className="sec-label">{scope === 'project' ? 'api.ts — this project' : 'api.ts — whole library'}</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <CodeViewer
          maxHeightClassName="max-h-[calc(100vh-8rem)]"
          tabs={[
            { id: 'ts', label: 'api.ts', language: 'text', code: ts },
            { id: 'json', label: 'JSON', language: 'json', code: json },
          ]}
        />
      </div>
    </aside>
  )
}
