import { ThemeProvider } from '@gummy-ui/ui'
import { Grid } from './components'

function App() {
  // ThemeProvider wraps Radix's <Theme>, supplying the accent CSS vars the
  // canvas TextField previews use. Violet matches studio's own UI accent.
  return (
    <ThemeProvider
      theme={{ accentColor: 'violet', appearance: 'light' }}
      components={{}}
      className="flex h-dvh flex-col overflow-hidden"
    >
      <Grid />
    </ThemeProvider>
  )
}

export default App
