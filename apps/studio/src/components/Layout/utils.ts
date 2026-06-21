/** Turns an arbitrary id (e.g. a React `useId()` value) into a safe CSS class token. */
export function escapeClassName(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_')
}
