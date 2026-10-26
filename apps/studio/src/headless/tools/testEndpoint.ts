import { executeTestRun, testRunGap } from '../../components/Api/testRun'
import { API_URL_NAME } from '../../components/Env/types'
import { ToolError } from '../errors'
import { input, obj, PROJECT, str, type Tool } from './shared'

/** How much of a response body goes back to the client. */
const BODY_LIMIT = 20_000

/**
 * `test_endpoint` — the studio's Test run (see the grilled design
 * `studio-api-test-runner`) without the browser: a real request through the
 * engine's own client (`executeTestRun`: the same model / api lowering the
 * app uses, `:param` substitution, response unwrapping), then the body
 * checked against the response model. It reaches the network, so it reads
 * nothing it is not given: the project's API_URL, or `apiUrl`.
 */
export const testEndpointTool: Tool = {
  name: 'test_endpoint',
  description:
    'Call an endpoint for real through the engine’s HTTP client and check the response against its response model — confirm an endpoint and its models match before building on them. The base URL is the project’s API_URL env var unless `apiUrl` is given; a relative API_URL (a dev proxy, e.g. "/api") needs `apiUrl` with the server’s origin.',
  inputSchema: input(
    {
      endpoint: str('Endpoint name or id.'),
      project: { ...PROJECT, description: 'Whose API_URL to call (optional with apiUrl).' },
      apiUrl: str('Absolute base URL, e.g. http://localhost:9100/api.'),
      query: obj('The query model’s values.'),
      parameter: obj('The URL :param values (the parameter model).'),
      body: obj('The request body.'),
    },
    ['endpoint'],
  ),
  write: false,
  run: async (s, i) => {
    const { endpoints, models } = s.ws.library
    const endpoint = endpoints.find((e) => e.id === i.endpoint || e.name === i.endpoint)
    if (!endpoint) throw new ToolError(`no endpoint "${i.endpoint}"`, 'endpoint')
    const fromEnv = i.project ? s.project(i.project).snapshot.env.find((v) => v.name.trim() === API_URL_NAME)?.value ?? '' : ''
    const apiUrl = String(i.apiUrl ?? fromEnv).trim()
    if (!/^https?:\/\//.test(apiUrl))
      throw new ToolError(apiUrl ? `API_URL "${apiUrl}" is relative — pass apiUrl with the server's origin (e.g. http://localhost:9100${apiUrl})` : 'no base URL — pass apiUrl, or a project with API_URL set', 'apiUrl')
    const gap = testRunGap(endpoint, models, apiUrl)
    if (gap) throw new ToolError(gap, 'endpoint')
    const result = await executeTestRun({
      endpoint,
      endpoints,
      models,
      apiUrl,
      inputs: { query: i.query, parameter: i.parameter, body: i.body },
    })
    const text = JSON.stringify(result.body ?? null)
    return {
      ok: result.ok,
      status: result.status ?? null,
      durationMs: result.durationMs,
      ...(result.errorMessage ? { error: result.errorMessage } : {}),
      matchesResponseModel: result.validation.length === 0,
      ...(result.validation.length ? { mismatches: result.validation } : {}),
      body: text.length > BODY_LIMIT ? `${text.slice(0, BODY_LIMIT)}… (${text.length} chars, truncated)` : result.body,
    }
  },
}
