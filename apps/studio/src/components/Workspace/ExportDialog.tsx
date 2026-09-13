import { Modal } from '@gummy-ui/ui'
import { Download, FileCode2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button, cn, CodeViewer } from '../common'
import { useProjectEndpoints, useProjectModels } from '../Library/scope'
import { buildExportFiles } from './exportFiles'
import type { ProjectDef } from './types'
import { useWorkspaceStore } from './workspaceStore'

function download(name: string, body: string) {
  const blob = new Blob([body], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * "Hand off" (the mockup's export dialog): the bundle a developer needs —
 * project.json, api.ts, model.ts, theme.ts, pages.ts, HANDOFF.md — with a
 * file list, the selected file's code (with copy), Download, and Download all.
 * Built from the persisted project (the autosave is 400 ms behind at most).
 */
export function ExportDialog({ project, onClose }: { project: ProjectDef; onClose: () => void }) {
  const endpoints = useProjectEndpoints()
  const models = useProjectModels()
  const logActivity = useWorkspaceStore((s) => s.logActivity)
  const files = useMemo(() => buildExportFiles(project, endpoints, models), [project, endpoints, models])
  const [current, setCurrent] = useState(files[0]?.name ?? '')
  const file = files.find((f) => f.name === current) ?? files[0]

  const downloadAll = () => {
    files.forEach((f) => download(f.name, f.body))
    logActivity('exported', 'project', project.name, `${files.length} files`, project.id)
  }

  return (
    <Modal
      id="studio-export"
      open
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
      title={`Hand off — ${project.name}`}
      description={`${files.length} files · everything a developer needs to build this for real`}
      width="min(92vw, 1040px)"
    >
      <div className="flex min-h-0 gap-3.5 pt-2">
        <div className="w-[200px] shrink-0 border-r border-line pr-3">
          {files.map((f) => (
            <button
              key={f.name}
              type="button"
              aria-selected={f.name === file?.name}
              onClick={() => setCurrent(f.name)}
              className={cn(
                'mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-ui text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink',
                f.name === file?.name && 'bg-panel-2 font-semibold text-ink',
              )}
            >
              <FileCode2 size={13} aria-hidden="true" className="shrink-0 text-ink-3" />
              <span className="min-w-0 flex-1 truncate font-mono">{f.name}</span>
              <span className="font-mono text-[10px] text-ink-3">
                {Math.max(1, Math.round(f.body.length / 1024))}k
              </span>
            </button>
          ))}
          <Button size="sm" className="mt-2.5 w-full" onClick={downloadAll}>
            <Download size={12} aria-hidden="true" />
            Download all
          </Button>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          {file && (
            <>
              <div className="mb-2 flex items-center gap-2">
                <span className="font-mono text-ui font-semibold text-ink">{file.name}</span>
                <span className="flex-1" />
                <Button size="sm" variant="primary" onClick={() => download(file.name, file.body)}>
                  <Download size={12} aria-hidden="true" />
                  Download
                </Button>
              </div>
              <CodeViewer
                key={file.name}
                maxHeightClassName="max-h-[52vh]"
                tabs={[
                  {
                    id: file.name,
                    label: file.name,
                    language: file.lang === 'json' ? 'json' : 'text',
                    code: file.body,
                  },
                ]}
              />
              <p className="mt-2 text-ui-xs leading-snug text-ink-3">
                project.json is the whole thing as data — the same file a runtime could render. The
                .ts files match the shape your team already writes by hand.
              </p>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
