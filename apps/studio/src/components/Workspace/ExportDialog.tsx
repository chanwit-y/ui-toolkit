import { Modal } from '@gummy-ui/ui'
import { Download, FileCode2, FolderDown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { currentPayload, isCliMode, cliInfo } from '../../cli/cliStorage'
import { canPickFolder, saveToProject, type SaveResult } from '../../cli/saveToProject'
import { Button, cn, CodeViewer } from '../common'
import { useProjectEndpoints, useProjectModels } from '../Library/scope'
import { buildExportFiles } from './exportFiles'
import { projectKey, runtimeProjectsFromPayload } from './runtimeProject'
import type { ProjectDef } from './types'
import { useWorkspaceStore, WORKSPACE_STORAGE_KEY } from './workspaceStore'

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
 * "Hand off": the runtime project document `<GummyApp>` renders (the file
 * `gummy studio` keeps in `gummy/projects/`), the custom action / component
 * stubs the app still codes, and HANDOFF.md — a file list, the selected
 * file's code (with copy), Download, and Download all. Built from the
 * persisted project (the autosave is 400 ms behind at most).
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

  // "Export to project": the bundle into the app's gummy/ folder — the
  // document where <GummyApp> reads it (projects/<key>/ split into page files, with every other
  // project's), the stubs and HANDOFF beside it (never in src/, so they can't
  // overwrite the app's real code). Under the CLI that folder is the served
  // one; elsewhere the folder picker / downloads (see cli/saveToProject.ts).
  const [saveMsg, setSaveMsg] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!saveMsg) return
    const t = setTimeout(() => setSaveMsg(''), 8000)
    return () => clearTimeout(t)
  }, [saveMsg])
  const exportToProject = async (repick: boolean) => {
    const payload = currentPayload(WORKSPACE_STORAGE_KEY)
    if (!payload) {
      setSaveMsg('Could not save: nothing is persisted yet')
      return
    }
    const key = projectKey(project.name)
    const extraFiles = Object.fromEntries(files.filter((f) => f.name !== `${key}.json`).map((f) => [f.name, f.body]))
    setSaving(true)
    try {
      const r: SaveResult = await saveToProject(payload, runtimeProjectsFromPayload(payload), { repick, extraFiles })
      if (r.mode === 'cancelled') return
      if (r.mode === 'error') setSaveMsg(`Could not save: ${r.message}`)
      else {
        setSaveMsg(
          r.mode === 'download'
            ? `Downloaded ${r.files.length} files — drop them into your project's gummy/ folder (projects/${key}.json is the single-file form)`
            : `Wrote ${r.files.length} files to ${r.where} (projects/${key}/ is what the app renders)`,
        )
        logActivity('exported', 'project', project.name, `${r.files.length} files to ${r.where}`, project.id)
      }
    } finally {
      setSaving(false)
    }
  }
  const exportLabel = isCliMode()
    ? `Export to project — write into ${cliInfo()?.dir ?? 'gummy'}/ (the folder gummy studio serves)`
    : canPickFolder()
      ? 'Export to project — pick your app\'s folder and write gummy/ into it (shift-click to pick another)'
      : 'Export to project — download the files for your app\'s gummy/ folder'

  return (
    <Modal
      id="studio-export"
      open
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
      title={`Hand off — ${project.name}`}
      description={`${files.length} file${files.length === 1 ? '' : 's'} · the project as the engine renders it`}
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
          <Button
            size="sm"
            variant="primary"
            className="mt-1.5 w-full"
            title={exportLabel}
            aria-label={exportLabel}
            disabled={saving}
            onClick={(e) => void exportToProject(e.shiftKey)}
          >
            <FolderDown size={12} aria-hidden="true" />
            Export to project
          </Button>
          {saveMsg && (
            <p role="status" className={cn('mt-2 text-ui-xs leading-snug', saveMsg.startsWith('Could not') ? 'text-danger' : 'text-ink-3')}>
              {saveMsg}
            </p>
          )}
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
                The .json file is the whole app as data — what &lt;GummyApp&gt; renders and what
                `gummy studio` writes to gummy/projects/ on every save. The .ts files are stubs for the
                code only the app can supply.
              </p>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
