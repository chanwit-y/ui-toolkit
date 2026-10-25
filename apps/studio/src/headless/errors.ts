/**
 * A tool call the MCP refuses: what is wrong and, when it is about the input,
 * where (`config.pagination.totalPath`) — returned to the client as an error
 * result Claude can act on, never thrown past the server.
 */
export class ToolError extends Error {
  readonly path?: string
  constructor(message: string, path?: string) {
    super(path ? `${path}: ${message}` : message)
    this.name = 'ToolError'
    this.path = path
  }
}
