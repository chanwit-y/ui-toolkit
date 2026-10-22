import { AlertTriangle, RefreshCw } from 'lucide-react'
import { cliInfo, isCliMode, useCliStatus } from './cliStorage'

/**
 * The strip across the top of the studio when a save to `gummy/workspace.json`
 * could not go through (see `cliStorage.ts`): the file changed on disk under
 * this tab (a `git pull`, another tab) — nothing is overwritten, the user
 * reloads and the in-memory edits since are lost — or the CLI did not answer.
 * Renders nothing outside CLI mode or while saves succeed.
 */
export function CliBanner() {
  const status = useCliStatus()
  if (!isCliMode() || (status !== 'stale' && status !== 'error')) return null
  const file = `${cliInfo()?.dir ?? 'gummy'}/workspace.json`
  const stale = status === 'stale'
  return (
    <div
      role="alert"
      className={`flex items-center gap-3 border-b border-line px-4 py-2 text-ui ${stale ? 'bg-warn/10 text-ink' : 'bg-danger/10 text-ink'}`}
    >
      <AlertTriangle size={14} className={stale ? 'text-warn' : 'text-danger'} aria-hidden="true" />
      <span className="flex-1">
        {stale ? (
          <>
            <span className="font-medium">{file}</span> changed on disk since this tab loaded it. Saving is paused so
            nothing is overwritten — reload to pick up the file (edits made here since are lost).
          </>
        ) : (
          <>
            Could not save to <span className="font-medium">{file}</span> — is <span className="font-mono">gummy studio</span>{' '}
            still running? The next edit retries.
          </>
        )}
      </span>
      {stale && (
        <button type="button" className="btn" onClick={() => window.location.reload()}>
          <RefreshCw size={12} aria-hidden="true" />
          Reload
        </button>
      )}
    </div>
  )
}
