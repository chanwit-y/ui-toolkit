import {
  ApiFactory,
  ApiMaster,
  HttpClientFactory,
  convertTModelToTArray,
  convertTModelToTypeBox,
  type TApiMaster,
  type TModelMaster,
} from '@gummy-ui/ui'
import { Value } from '@sinclair/typebox/value'
import type { AxiosResponse } from 'axios'
import { serializeModels } from '../Model/serialize'
import type { ModelDef, ModelField } from '../Model/types'
import { serializeEndpoints } from './serialize'
import type { EndpointDef } from './types'

/**
 * The API page's test runner (see the grilled design): executes an endpoint
 * through the REAL engine client — the same lowering the Live Preview uses
 * (serializeModels + serializeEndpoints → HttpClientFactory(API_URL) →
 * ApiMaster) — so a run exercises exactly what the exported config does:
 * axios interceptors, `:param` substitution, response unwrapping. The HTTP
 * status is captured via the client's `onLog` callback (the engine call
 * itself resolves to the unwrapped body only).
 */

/* ------------------------------------------------------------- skeleton */

function fieldSkeleton(field: ModelField): unknown {
  switch (field.kind) {
    case 'string':
      return ''
    case 'number':
    case 'integer':
      return 0
    case 'boolean':
      return false
    case 'any':
      return null
    case 'object':
      return fieldsSkeleton(field.children)
    case 'array':
      return [field.arrayOf === 'object' ? fieldsSkeleton(field.children) : fieldSkeleton({ ...field, kind: field.arrayOf })]
  }
}

function fieldsSkeleton(fields: ModelField[]): Record<string, unknown> {
  return Object.fromEntries(
    fields.filter((f) => f.name.trim()).map((f) => [f.name, fieldSkeleton(f)]),
  )
}

/** A pretty-printed JSON template for a model — the seed for a test input. */
export function modelSkeletonJson(models: ModelDef[], modelId: string | null): string {
  const model = models.find((m) => m.id === modelId)
  if (!model) return '{}'
  return JSON.stringify(fieldsSkeleton(model.fields), null, 2)
}

/* --------------------------------------------------------------- gating */

/**
 * Why this endpoint can't run, or null when it can. Mirrors the Live
 * Preview's wiring-gap rules: the engine's ApiMaster build THROWS without a
 * resolvable response model, and every request needs a base URL.
 */
export function testRunGap(
  endpoint: EndpointDef,
  models: ModelDef[],
  apiUrl: string,
): string | null {
  if (!endpoint.name.trim()) return 'name the endpoint first'
  if (endpoint.response == null || !models.some((m) => m.id === endpoint.response))
    return 'needs a response model — set one under Model references'
  if (!apiUrl) return 'set API_URL on the Env page'
  return null
}

/* ------------------------------------------------------------------ run */

export type TestRunResult = {
  ok: boolean
  /** HTTP status — captured via onLog on success, from the axios error on failure. */
  status?: number
  durationMs: number
  /** The engine-view payload: the unwrapped body a bin would bind to (or the
   * error response body on failure). */
  body: unknown
  errorMessage?: string
  /** Response-model mismatch paths (TypeBox Value.Errors), empty when clean. */
  validation: string[]
}

/** Non-blocking response validation against the endpoint's response model. */
function validateResponse(
  model: TModelMaster,
  responseName: string,
  body: unknown,
): string[] {
  try {
    const tmodel = model[responseName]
    const schema =
      (tmodel as { type?: string }).type === 'array'
        ? convertTModelToTArray(tmodel)
        : convertTModelToTypeBox(tmodel)
    return [...Value.Errors(schema, body)]
      .slice(0, 8)
      .map((e) => `${e.path || '/'} — ${e.message}`)
  } catch {
    return []
  }
}

export async function executeTestRun(opts: {
  endpoint: EndpointDef
  endpoints: EndpointDef[]
  models: ModelDef[]
  apiUrl: string
  inputs: { query?: unknown; parameter?: unknown; body?: unknown }
}): Promise<TestRunResult> {
  const { endpoint, endpoints, models, apiUrl, inputs } = opts

  // The exact export the code pane shows — serializer bugs surface here too.
  const model = serializeModels(models) as TModelMaster
  const api = serializeEndpoints(endpoints, models) as unknown as TApiMaster<TModelMaster>
  const name = endpoint.name.trim()

  let loggedStatus: number | undefined
  const http = new HttpClientFactory(
    apiUrl,
    async () => '',
    '1.0.0',
    30000,
    [],
    [],
    undefined,
    undefined,
    (response: AxiosResponse) => {
      loggedStatus = response?.status
    },
  )
  const apis = new ApiMaster(model, api, new ApiFactory(http, model))

  // Positional args in the engine's fixed order — only the defined refs.
  const args: unknown[] = []
  if (endpoint.query != null) args.push(inputs.query)
  if (endpoint.parameter != null) args.push(inputs.parameter)
  if (endpoint.body != null) args.push(inputs.body)

  const responseName = String(api[name]?.response ?? '')
  const started = performance.now()
  try {
    const fn = apis.api[name] as unknown as (...a: unknown[]) => Promise<unknown>
    const body = await fn(...args)
    return {
      ok: true,
      status: loggedStatus,
      durationMs: Math.round(performance.now() - started),
      body,
      validation: responseName ? validateResponse(model, responseName, body) : [],
    }
  } catch (err) {
    const axErr = err as {
      message?: string
      response?: { status?: number; data?: unknown }
    }
    return {
      ok: false,
      status: axErr.response?.status,
      durationMs: Math.round(performance.now() - started),
      body: axErr.response?.data,
      errorMessage: axErr.message ?? String(err),
      validation: [],
    }
  }
}
