import { Modal } from '@gummy-ui/ui'
import { useState, type FormEvent } from 'react'
import { Button, Input, Select } from '../common'
import type { NavParamSource } from '../Layout/types'
import { isValidPageKey, normalizePath, pageKey, pathParams, slugPath } from './snapshots'
import type { PageDef } from './types'
import { useWorkspaceStore } from './workspaceStore'

/** Where a page's breadcrumb label comes from; `state` (a field of one of
 * the page's loads) only once the page has loads. */
type CrumbKind = 'name' | 'value' | 'param' | 'query' | 'state'
const CRUMB_OPTIONS: { value: CrumbKind; label: string }[] = [
  { value: 'name', label: 'Page name' },
  { value: 'value', label: 'Fixed text' },
  { value: 'param', label: 'URL :param' },
  { value: 'query', label: 'URL ?query' },
]
const STATE_CRUMB_OPTION = { value: 'state' as const, label: 'Page data' }

function crumbKind(src: NavParamSource | undefined): CrumbKind {
  if (!src) return 'name'
  if (src.type === 'value') return 'value'
  if (src.type === 'url') return src.source === 'query' ? 'query' : 'param'
  if (src.type === 'state') return 'state'
  return 'name'
}

function crumbText(src: NavParamSource | undefined): string {
  if (!src) return ''
  if (src.type === 'value') return src.value
  if (src.type === 'url') return src.key
  if (src.type === 'state') return src.key
  return ''
}

function toCrumb(kind: CrumbKind, text: string, path = ''): NavParamSource | null {
  const t = text.trim()
  if (kind === 'name' || !t) return null
  if (kind === 'value') return { type: 'value', value: t }
  if (kind === 'state') return { type: 'state', key: t, path: path.trim() }
  return { type: 'url', key: t, source: kind }
}

/** Pages that would make a cycle if picked as `pageId`'s parent: itself and its descendants. */
function descendantIds(pages: PageDef[], pageId: string): Set<string> {
  const out = new Set<string>([pageId])
  let grew = true
  while (grew) {
    grew = false
    for (const pg of pages) {
      if (pg.parentId && out.has(pg.parentId) && !out.has(pg.id)) {
        out.add(pg.id)
        grew = true
      }
    }
  }
  return out
}

/**
 * New page / page settings (the mockup's `new-page` and `page-settings`
 * dialogs) on the library Modal. The route follows the name as a slug until
 * it is edited by hand; `:params` in it are listed back so the author sees
 * what a link to this page will have to supply.
 */
export function PageDialog({
  projectId,
  page,
  onClose,
  onCreated,
}: {
  projectId: string
  /** Editing an existing page; omitted for a new one. */
  page?: PageDef
  onClose: () => void
  onCreated?: (page: PageDef) => void
}) {
  const addPage = useWorkspaceStore((s) => s.addPage)
  const updatePage = useWorkspaceStore((s) => s.updatePage)
  const siblings = useWorkspaceStore(
    (s) => s.projects.find((p) => p.id === projectId)?.snapshot.pages ?? [],
  )
  const [name, setName] = useState(page?.name ?? '')
  const [path, setPath] = useState(page?.path ?? '')
  const [pathTouched, setPathTouched] = useState(!!page)
  const [key, setKey] = useState(page?.key ?? '')
  const [keyTouched, setKeyTouched] = useState(!!page)
  const [parentId, setParentId] = useState(page?.parentId ?? '')
  const [kind, setKind] = useState<CrumbKind>(crumbKind(page?.crumb))
  const [crumbValue, setCrumbValue] = useState(crumbText(page?.crumb))
  const [crumbPath, setCrumbPath] = useState(page?.crumb?.type === 'state' ? page.crumb.path : '')
  const loads = page?.loads ?? []
  const crumbOptions = loads.length > 0 || kind === 'state' ? [...CRUMB_OPTIONS, STATE_CRUMB_OPTION] : CRUMB_OPTIONS
  const [hideBreadcrumbs, setHideBreadcrumbs] = useState(!!page?.hideBreadcrumbs)

  const effectivePath = pathTouched ? path : slugPath(name || 'page')
  const params = pathParams(normalizePath(effectivePath, name || 'page'))
  // The key follows the name until edited by hand (a new page's key is made
  // unique on create; an edited one must already be unique and an identifier).
  const effectiveKey = keyTouched ? key.trim() : pageKey(name || 'page')
  const keyTaken = siblings.some((p) => p.id !== page?.id && p.key === effectiveKey)
  const keyInvalid = keyTouched && (!isValidPageKey(effectiveKey) || keyTaken)
  const blockedParents = page ? descendantIds(siblings, page.id) : new Set<string>()
  const parentOptions = [
    { value: '', label: 'None (top level)' },
    ...siblings.filter((p) => !blockedParents.has(p.id)).map((p) => ({ value: p.id, label: p.name })),
  ]
  const crumb = toCrumb(
    kind,
    kind === 'param' && params.length && !crumbValue
      ? params[0]
      : kind === 'state' && !crumbValue
        ? (loads[0]?.id ?? '')
        : crumbValue,
    crumbPath,
  )
  const breadcrumbPatch = {
    parentId: parentId || null,
    crumb,
    hideBreadcrumbs,
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (keyInvalid) return
    if (page) {
      updatePage(projectId, page.id, { name, path: effectivePath, key: effectiveKey, ...breadcrumbPatch })
      onClose()
    } else {
      const created = addPage(projectId, { name, path: effectivePath, key: effectiveKey })
      if (parentId || crumb || hideBreadcrumbs) updatePage(projectId, created.id, breadcrumbPatch)
      onCreated?.(created)
      onClose()
    }
  }

  return (
    <Modal
      id={page ? `studio-page-edit-${page.id}` : 'studio-page-new'}
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={page ? 'Page settings' : 'New page'}
      description={
        page
          ? 'Rename the page or change the route it is served at.'
          : 'A page is one screen of the app, with its own canvas and route.'
      }
      width="480px"
    >
      <form onSubmit={submit} className="space-y-3 pt-2 text-ink">
        <label className="block">
          <span className="mb-1 block text-ui-sm font-medium text-ink-2">Page name</span>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Country detail"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-ui-sm font-medium text-ink-2">Route</span>
          <Input
            value={effectivePath}
            onChange={(e) => {
              setPathTouched(true)
              setPath(e.target.value)
            }}
            placeholder="/countries/:code"
            className="font-mono"
          />
          <span className="mt-1 block text-ui-xs text-ink-3">
            {params.length
              ? `Expects ${params.map((p) => `:${p}`).join(', ')} — a link to this page supplies ${params.length === 1 ? 'it' : 'them'}.`
              : 'Use :name for a parameter, e.g. /countries/:code.'}
          </span>
        </label>
        <label className="block">
          <span className="mb-1 block text-ui-sm font-medium text-ink-2">Key</span>
          <Input
            value={effectiveKey}
            onChange={(e) => {
              setKeyTouched(true)
              setKey(e.target.value)
            }}
            placeholder="countryDetail"
            className="font-mono"
            aria-invalid={keyInvalid || undefined}
          />
          <span className={`mt-1 block text-ui-xs ${keyInvalid ? 'text-danger' : 'text-ink-3'}`}>
            {keyInvalid
              ? keyTaken
                ? 'Another page already uses this key.'
                : 'Letters, digits and _ only, not starting with a digit.'
              : 'Names the page in pages.ts — what a “Go to page” action points at.'}
          </span>
        </label>

        <fieldset className="space-y-2 border-t border-line pt-3">
          <legend className="sec-label">Breadcrumbs</legend>
          <label className="block">
            <span className="mb-1 block text-ui-sm font-medium text-ink-2">Parent page</span>
            <Select aria-label="Parent page" options={parentOptions} value={parentId} onChange={setParentId} />
            <span className="mt-1 block text-ui-xs text-ink-3">
              The trail walks up parents; a parent’s :params are filled from the current route.
            </span>
          </label>
          <div className="block">
            <span className="mb-1 block text-ui-sm font-medium text-ink-2">Label</span>
            <div className="flex gap-1.5">
              <div className="w-32 shrink-0">
                <Select
                  aria-label="Breadcrumb label source"
                  options={crumbOptions}
                  value={kind}
                  onChange={(v) => {
                    setKind(v as CrumbKind)
                    setCrumbValue('')
                    setCrumbPath('')
                  }}
                />
              </div>
              {kind === 'state' ? (
                <div className="flex flex-1 gap-1.5">
                  <div className="flex-1">
                    <Select
                      aria-label="Breadcrumb load"
                      options={[
                        ...(crumbValue && !loads.some((l) => l.id === crumbValue)
                          ? [{ value: crumbValue, label: '⚠ deleted load' }]
                          : []),
                        ...loads.map((l) => ({ value: l.id, label: l.key })),
                      ]}
                      value={crumbValue || loads[0]?.id || ''}
                      onChange={setCrumbValue}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      aria-label="Breadcrumb field"
                      value={crumbPath}
                      onChange={(e) => setCrumbPath(e.target.value)}
                      placeholder="field, e.g. name"
                      className="font-mono"
                    />
                  </div>
                </div>
              ) : kind === 'param' && params.length > 0 ? (
                <div className="flex-1">
                  <Select
                    aria-label="Route param"
                    options={params.map((p) => ({ value: p, label: `:${p}` }))}
                    value={crumbValue || params[0]}
                    onChange={setCrumbValue}
                  />
                </div>
              ) : kind !== 'name' ? (
                <div className="flex-1">
                  <Input
                    aria-label="Breadcrumb label value"
                    value={crumbValue}
                    onChange={(e) => setCrumbValue(e.target.value)}
                    placeholder={kind === 'value' ? 'Fixed text' : kind === 'param' ? 'param name' : 'query name'}
                    className={kind === 'value' ? undefined : 'font-mono'}
                  />
                </div>
              ) : null}
            </div>
            <span className="mt-1 block text-ui-xs text-ink-3">
              Also the exported title. A URL source reads the value while the page is open.
            </span>
          </div>
          <label className="flex items-center gap-2 text-ui-sm font-medium text-ink-2">
            <input
              type="checkbox"
              checked={hideBreadcrumbs}
              onChange={(e) => setHideBreadcrumbs(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-line-strong accent-accent"
            />
            Hide the breadcrumb strip on this page
          </label>
        </fieldset>
        <div className="flex justify-end gap-2 border-t border-line pt-3">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={keyInvalid}>
            {page ? 'Save' : 'Create page'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
