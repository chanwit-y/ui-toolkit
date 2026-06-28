import { useMemo } from 'react'
import { CodeViewer } from '../common'
import { useModelStore } from './modelStore'
import { toModelJson, toModelTs } from './serialize'

/** Right pane: the live `TModelMaster` export — paste-ready TS + raw JSON. */
export function ModelCode() {
  const models = useModelStore((s) => s.models)

  const ts = useMemo(() => toModelTs(models), [models])
  const json = useMemo(() => toModelJson(models), [models])

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-zinc-200 bg-white">
      <div className="shrink-0 border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-800">Model config</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <CodeViewer
          maxHeightClassName="max-h-[calc(100vh-12rem)]"
          tabs={[
            { id: 'ts', label: 'model.ts', language: 'text', code: ts },
            { id: 'json', label: 'JSON', language: 'json', code: json },
          ]}
        />
      </div>
    </aside>
  )
}
