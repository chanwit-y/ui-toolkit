/**
 * Editor-side shapes for the API page. Endpoints reference models by their
 * stable `ModelDef.id` — rename-safe, since a model rename on the Model page
 * must not break endpoints — and `serialize.ts` resolves ids to current model
 * names when lowering onto the engine's `TApiMaster` shape.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

/** The four `TApiMaster` entry fields that reference a model by name. */
export type ModelRefKey = 'response' | 'query' | 'parameter' | 'body'

export const MODEL_REF_KEYS: ModelRefKey[] = ['response', 'query', 'parameter', 'body']

export type EndpointDef = {
  /** Stable id for React keys + store ops; never serialized. */
  id: string
  /** Becomes the endpoint's key in the exported `TApiMaster` object. */
  name: string
  description: string
  /** Endpoint path; `:param` placeholders are filled from the parameter model. */
  url: string
  method: HttpMethod
  /** Only meaningful on GET — wraps the caller with `.use(options)`. */
  withOptions: boolean
  /** Model refs by `ModelDef.id`; null = unset. */
  response: string | null
  query: string | null
  parameter: string | null
  body: string | null
}
