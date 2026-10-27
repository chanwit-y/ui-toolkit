
import { Theme } from '@radix-ui/themes'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { ThemeProps } from '@radix-ui/themes'
import type { Appearance, GummyThemeProps, Surface, ThemeComponents, ThemeContextType, ThemeProviderProps } from '../@types'

const APPEARANCE_STORAGE_KEY = 'gummy-ui-appearance'

/** Read the persisted appearance, falling back to the configured default. */
const readStoredAppearance = (fallback: Appearance): Appearance => {
  if (typeof window === 'undefined') return fallback
  const stored = window.localStorage.getItem(APPEARANCE_STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : fallback
}

/** Toggle the `dark` class on <html> so Tailwind `dark:` variants reach portaled content too. */
const syncDocumentAppearance = (appearance: Appearance) => {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', appearance === 'dark')
}

/**
 * Mirror the app's surface on <html>: Radix Themes re-applies its own
 * `.radix-themes` tokens on portaled content (selects, dropdowns), which our
 * `data-surface` root does not reach — `html[data-surface="glass"]` in
 * surface.css does. Only the outermost provider writes it.
 */
const syncDocumentSurface = (surface: Surface) => {
  if (typeof document === 'undefined') return
  if (surface === 'glass') document.documentElement.dataset.surface = 'glass'
  else delete document.documentElement.dataset.surface
}

const defaultTheme = {
  appearance: 'light',
  accentColor: 'blue',
  radius: 'small',
  panelBackground: 'translucent',
} as const

/** The CSS var `.gummy-backdrop` paints (see `styles/surface.css`). */
export const BACKDROP_VAR = '--gummy-backdrop'

/**
 * Splits the Gummy-only keys off a theme: `surface` / `background` are read
 * by the provider (the `data-surface` attribute, the backdrop var) and must
 * not reach Radix's `<Theme>`, which spreads unknown props onto its div.
 */
export const splitGummyTheme = (
  theme: GummyThemeProps | undefined,
): { radix: ThemeProps | undefined; surface?: Surface; background?: string } => {
  if (!theme) return { radix: undefined }
  const { surface, background, ...radix } = theme
  return { radix, surface, background }
}

const defaultComponents: ThemeComponents = {
  // No button colour by default: buttons follow the theme accent. (It used to
  // be "blue", so every button ignored an accent the app had set.)
  button: { color: undefined },
  // Every dataTable role is intentionally left unset: header / row-hover /
  // pagination resolve to the Radix accent (--accent-*), the edit button to
  // button.color, and delete to red — all flipping with light/dark. A named
  // color pins a role (a Radix button colour for the action buttons, the
  // legacy static map for the rest).
  dataTable: {},
}

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  components: defaultComponents
})

export function ThemeProvider({
  children,
  theme,
  className,
  components
}: ThemeProviderProps) {
  const parentThemeContext = useContext(ThemeContext)

  // A nested ThemeProvider defers appearance to the outermost one so a single
  // <html> `dark` class drives the whole tree.
  const isNested = !!parentThemeContext.setAppearance

  const initialAppearance: Appearance =
    theme?.appearance === 'dark' || theme?.appearance === 'light'
      ? theme.appearance
      : (defaultTheme.appearance as Appearance)

  const [ownAppearance, setOwnAppearance] = useState<Appearance>(() =>
    readStoredAppearance(initialAppearance)
  )

  const setOwnAppearancePersisted = useCallback((next: Appearance) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(APPEARANCE_STORAGE_KEY, next)
    }
    setOwnAppearance(next)
  }, [])

  const toggleOwnAppearance = useCallback(() => {
    setOwnAppearance((prev) => {
      const next: Appearance = prev === 'dark' ? 'light' : 'dark'
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(APPEARANCE_STORAGE_KEY, next)
      }
      return next
    })
  }, [])

  const appearance = isNested ? parentThemeContext.appearance! : ownAppearance
  const setAppearance = isNested
    ? parentThemeContext.setAppearance!
    : setOwnAppearancePersisted
  const toggleAppearance = isNested
    ? parentThemeContext.toggleAppearance!
    : toggleOwnAppearance

  useEffect(() => {
    if (isNested) return
    syncDocumentAppearance(appearance)
  }, [isNested, appearance])

  // Surface (flat / glass, see the grilled design `glass-surface`): the
  // configured value, unless `setSurface` overrode it at runtime. The override
  // is deliberately NOT persisted — the project config is the source of truth,
  // and a remembered override would make a flat project open as glass. A
  // provider with its own `theme.surface` (GummyApp inside the studio) owns
  // the value; one without (a portal's inner provider) inherits the parent's.
  const configuredSurface: Surface = theme?.surface === 'glass' ? 'glass' : 'flat'
  const ownsSurface = !isNested || theme?.surface !== undefined
  const [surfaceOverride, setSurfaceOverride] = useState<Surface | null>(null)
  const surface: Surface = ownsSurface
    ? surfaceOverride ?? configuredSurface
    : parentThemeContext.surface ?? 'flat'
  const setSurface = ownsSurface ? setSurfaceOverride : parentThemeContext.setSurface!
  const background = theme?.background ?? (ownsSurface ? undefined : parentThemeContext.theme?.background)

  const resolvedTheme = useMemo<GummyThemeProps>(() => {
    return {
      ...defaultTheme,
      ...parentThemeContext.theme,
      ...theme,
      appearance,
      surface,
      ...(background ? { background } : {}),
    }
  }, [parentThemeContext.theme, theme, appearance, surface, background])

  // The backdrop paint reaches `.gummy-backdrop` as a CSS var on the Theme root
  // (so a nested provider in a portal inherits it); unset = the default
  // accent gradient in surface.css.
  useEffect(() => {
    if (isNested) return
    syncDocumentSurface(surface)
  }, [isNested, surface])

  const rootStyle = useMemo<CSSProperties | undefined>(
    () => (surface === 'glass' && background ? ({ [BACKDROP_VAR]: background } as CSSProperties) : undefined),
    [surface, background],
  )

  const resolvedComponents = useMemo<ThemeComponents>(() => {
    const parentComponents = parentThemeContext.components 
    const nextComponents = components || {}

    return {
      ...defaultComponents,
      ...parentComponents,
      ...nextComponents,
      button: {
        color: nextComponents.button?.color ?? parentComponents.button?.color,
      },
      dataTable: {
        // Leave these undefined when unconfigured so the dt*Class helpers fall
        // back to the Radix accent (solid --accent-9, auto dark-flip). Naming a
        // color opts into the legacy static map (light-only) on purpose.
        headerColor: nextComponents.dataTable?.headerColor ?? parentComponents.dataTable?.headerColor ?? defaultComponents.dataTable?.headerColor,
        headerTextColor: nextComponents.dataTable?.headerTextColor ?? parentComponents.dataTable?.headerTextColor ?? defaultComponents.dataTable?.headerTextColor,
        headerFontSize: nextComponents.dataTable?.headerFontSize ?? parentComponents.dataTable?.headerFontSize ?? defaultComponents.dataTable?.headerFontSize,
        headerFontWeight: nextComponents.dataTable?.headerFontWeight ?? parentComponents.dataTable?.headerFontWeight ?? defaultComponents.dataTable?.headerFontWeight,
        headerHoverColor: nextComponents.dataTable?.headerHoverColor ?? parentComponents.dataTable?.headerHoverColor ?? defaultComponents.dataTable?.headerHoverColor,
        paginationButtonColor: nextComponents.dataTable?.paginationButtonColor ?? parentComponents.dataTable?.paginationButtonColor ?? defaultComponents.dataTable?.paginationButtonColor,
        paginationButtonHoverColor: nextComponents.dataTable?.paginationButtonHoverColor ?? parentComponents.dataTable?.paginationButtonHoverColor ?? defaultComponents.dataTable?.paginationButtonHoverColor,
        rowHoverColor: nextComponents.dataTable?.rowHoverColor ?? parentComponents.dataTable?.rowHoverColor ?? defaultComponents.dataTable?.rowHoverColor,
        editButtonColor: nextComponents.dataTable?.editButtonColor ?? parentComponents.dataTable?.editButtonColor ?? defaultComponents.dataTable?.editButtonColor,
        deleteButtonColor: nextComponents.dataTable?.deleteButtonColor ?? parentComponents.dataTable?.deleteButtonColor ?? defaultComponents.dataTable?.deleteButtonColor,
      },
      // textField: {
      //   ...parentComponents.textField,
      //   ...nextComponents.textField,
      // },
    }
  }, [parentThemeContext.components, components])

  return (
    <ThemeContext.Provider
      value={{ theme: resolvedTheme, components: resolvedComponents, appearance, setAppearance, toggleAppearance, surface, setSurface }}
    >
      <Theme
        appearance={resolvedTheme.appearance}
        accentColor={resolvedTheme.accentColor}
        radius={resolvedTheme.radius}
        panelBackground={resolvedTheme.panelBackground}
        className={className}
        data-surface={surface}
        style={rootStyle}
      >
        {children}
      </Theme>
    </ThemeContext.Provider>
  )
}

export const useTheme = (t: ThemeContextType | undefined = undefined) => {
  const context = useContext(ThemeContext)
  if (!context && !t) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context || t
}


// export const withTheam = <T extends any>(Component: ComponentType<BaseComponentProps & T>): ComponentType<BaseComponentProps & T> => {

//   const WrappedComponent = (props: any) => {
//     const { components } = useTheme()
//     return <Component {...props} {...(components[Component.displayName as keyof Components] || {})} />
//   }
  
//   WrappedComponent.displayName = `withTheam(${Component.displayName || Component.name || 'Component'})`
  
//   return WrappedComponent
// }