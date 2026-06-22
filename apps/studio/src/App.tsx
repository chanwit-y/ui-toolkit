import { CoreProvider, ThemeProvider } from '@gummy-ui/ui'
import { Grid } from './components'

function App() {
  // ThemeProvider wraps Radix's <Theme>, supplying the accent CSS vars the
  // canvas previews use (the primary/brand color real components tint to).
  // CoreProvider (isRoot) supplies the observe table + Data/Query/Loading
  // contexts that engine-aware previews need — the select cell renders the real
  // Autocomplete2, which calls useCore/useData/useQuery and would otherwise throw.
  return (
    <ThemeProvider
      theme={{ accentColor: 'teal', appearance: 'light' }}
      components={{}}
      className="flex h-dvh flex-col overflow-hidden"
    >
      <CoreProvider isRoot>
        <Grid />
      </CoreProvider>
    </ThemeProvider>
  )
}

export default App
