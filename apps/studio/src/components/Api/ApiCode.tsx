import { useMemo } from 'react'
import { CodeViewer } from '../common'
import { useModelStore } from '../Model/modelStore'
import { useApiStore } from './apiStore'
import { toApiJson, toApiTs } from './serialize'

/** Right pane: the live `TApiMaster` export — paste-ready TS + raw JSON. Reads
 * both stores, since model refs resolve to whatever the models are named now. */
export function ApiCode() {
  const endpoints = useApiStore((s) => s.endpoints)
  const models = useModelStore((s) => s.models)

  const ts = useMemo(() => toApiTs(endpoints, models), [endpoints, models])
  const json = useMemo(() => toApiJson(endpoints, models), [endpoints, models])

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-zinc-200 bg-white">
      <div className="shrink-0 border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-800">API config</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <CodeViewer
          maxHeightClassName="max-h-[calc(100vh-12rem)]"
          tabs={[
            { id: 'ts', label: 'api.ts', language: 'text', code: ts },
            { id: 'json', label: 'JSON', language: 'json', code: json },
          ]}
        />
      </div>
    </aside>
  )
}
