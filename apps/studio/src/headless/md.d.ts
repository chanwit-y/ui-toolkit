/** The guides are bundled as text (`import x from './guides/a.md' with { type: 'text' }`, Bun's text loader). */
declare module '*.md' {
  const text: string
  export default text
}
