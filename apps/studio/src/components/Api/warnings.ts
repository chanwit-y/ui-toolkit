import type { ModelDef } from '../Model/types'
import { MODEL_REF_KEYS, type EndpointDef, type ModelRefKey } from './types'

/**
 * Non-blocking authoring checks for one endpoint. Everything here is a warning
 * — the page never prevents an edit or an export, it just surfaces states that
 * would misbehave once the exported config reaches the engine.
 */

export type WarningField = 'name' | 'url' | ModelRefKey

export type EndpointWarning = {
  field: WarningField
  message: string
}

/** The `:param` tokens in a URL — "/detail/:id" → ["id"]. */
export function urlParams(url: string): string[] {
  return [...url.matchAll(/:([A-Za-z_$][A-Za-z0-9_$]*)/g)].map((m) => m[1])
}

export function endpointWarnings(
  endpoint: EndpointDef,
  endpoints: EndpointDef[],
  models: ModelDef[],
): EndpointWarning[] {
  const warnings: EndpointWarning[] = []
  const modelById = new Map(models.map((m) => [m.id, m]))

  const name = endpoint.name.trim()
  if (name && endpoints.some((e) => e.id !== endpoint.id && e.name.trim() === name)) {
    warnings.push({
      field: 'name',
      message: `Duplicate name "${name}" — only one entry survives in the exported object.`,
    })
  }

  if (endpoint.response == null) {
    warnings.push({
      field: 'response',
      message: 'No response model selected — the engine expects one on almost every endpoint.',
    })
  }

  for (const key of MODEL_REF_KEYS) {
    const id = endpoint[key]
    if (id != null && !modelById.has(id)) {
      warnings.push({
        field: key,
        message: 'References a deleted model — the export emits "MISSING_MODEL".',
      })
    }
  }

  const params = urlParams(endpoint.url)
  const parameterModel =
    endpoint.parameter != null ? modelById.get(endpoint.parameter) : undefined

  if (params.length > 0 && endpoint.parameter == null) {
    warnings.push({
      field: 'url',
      message: `URL has :${params.join(', :')} but no parameter model is selected.`,
    })
  }
  if (params.length === 0 && endpoint.parameter != null) {
    warnings.push({
      field: 'parameter',
      message: 'A parameter model is selected but the URL has no :param placeholders.',
    })
  }
  if (parameterModel && params.length > 0) {
    const fieldNames = new Set(
      parameterModel.fields.map((f) => f.name.trim()).filter(Boolean),
    )
    const missing = params.filter((p) => !fieldNames.has(p))
    if (missing.length > 0) {
      warnings.push({
        field: 'parameter',
        message: `Model "${parameterModel.name}" has no field for :${missing.join(', :')}.`,
      })
    }
    const unused = [...fieldNames].filter((f) => !params.includes(f))
    if (unused.length > 0) {
      warnings.push({
        field: 'parameter',
        message: `Field ${unused.join(', ')} in "${parameterModel.name}" matches no URL :param.`,
      })
    }
  }

  return warnings
}
