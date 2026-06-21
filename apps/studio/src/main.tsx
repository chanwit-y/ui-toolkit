import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Radix Themes CSS powers the real <TextFieldBase> previews rendered on the
// canvas. We import Radix's compiled stylesheet directly rather than
// `@gummy-ui/ui/styles.css`, because that file is authored for Tailwind 3
// (`@tailwind base`, `@apply bg-gradient-to-r`) and breaks studio's Tailwind 4
// pipeline. The component's own Tailwind utility classes are emitted by
// studio's Tailwind via the `@source` directive in index.css.
import '@radix-ui/themes/styles.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
