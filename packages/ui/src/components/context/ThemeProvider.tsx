
import { Theme } from '@radix-ui/themes'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Appearance, ThemeComponents, ThemeContextType, ThemeProviderProps } from '../@types'

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

const defaultTheme = {
  appearance: 'light',
  accentColor: 'blue',
  radius: 'small',
  panelBackground: 'translucent',
} as const

const defaultComponents: ThemeComponents = {
  button: {
    color: 'blue',
  },
  dataTable: {
    headerColor: 'blue',
    headerHoverColor: 'blue',
    paginationButtonColor: 'blue',
    paginationButtonHoverColor: 'blue',
    rowHoverColor: 'blue',
    editButtonColor: 'blue',
    deleteButtonColor: 'red',
  },
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

  const resolvedTheme = useMemo(() => {
    return {
      ...defaultTheme,
      ...parentThemeContext.theme,
      ...theme,
      appearance,
    }
  }, [parentThemeContext.theme, theme, appearance])

  const resolvedComponents = useMemo<ThemeComponents>(() => {
    const parentComponents = parentThemeContext.components 
    const nextComponents = components || {}
    const defaultButtonColor =  'blue'

    return {
      ...defaultComponents,
      ...parentComponents,
      ...nextComponents,
      button: {
        color: nextComponents.button?.color ?? parentComponents.button?.color ?? defaultButtonColor,
      },
      dataTable: {
        headerColor: nextComponents.dataTable?.headerColor ?? parentComponents.dataTable?.headerColor ?? defaultComponents.dataTable?.headerColor ?? 'blue',
        headerHoverColor: nextComponents.dataTable?.headerHoverColor ?? parentComponents.dataTable?.headerHoverColor ?? defaultComponents.dataTable?.headerHoverColor ?? 'blue',
        paginationButtonColor: nextComponents.dataTable?.paginationButtonColor ?? parentComponents.dataTable?.paginationButtonColor ?? defaultComponents.dataTable?.paginationButtonColor ?? 'blue',
        paginationButtonHoverColor: nextComponents.dataTable?.paginationButtonHoverColor ?? parentComponents.dataTable?.paginationButtonHoverColor ?? defaultComponents.dataTable?.paginationButtonHoverColor ?? 'blue',
        rowHoverColor: nextComponents.dataTable?.rowHoverColor ?? parentComponents.dataTable?.rowHoverColor ?? defaultComponents.dataTable?.rowHoverColor ?? 'blue',
        editButtonColor: nextComponents.dataTable?.editButtonColor ?? parentComponents.dataTable?.editButtonColor ?? defaultComponents.dataTable?.editButtonColor ?? 'blue',
        deleteButtonColor: nextComponents.dataTable?.deleteButtonColor ?? parentComponents.dataTable?.deleteButtonColor ?? defaultComponents.dataTable?.deleteButtonColor ?? 'red',
      },
      // textField: {
      //   ...parentComponents.textField,
      //   ...nextComponents.textField,
      // },
    }
  }, [parentThemeContext.components, components])

  return (
    <ThemeContext.Provider value={{ theme: resolvedTheme, components: resolvedComponents, appearance, setAppearance, toggleAppearance }}>
      <Theme
        appearance={resolvedTheme.appearance}
        accentColor={resolvedTheme.accentColor}
        radius={resolvedTheme.radius}
        panelBackground={resolvedTheme.panelBackground}
        className={className}
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