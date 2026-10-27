import { createContext, useContext, type ReactNode } from "react";

/**
 * The app's locale for `formatCell` (`ColumnDef.format`): a BCP 47 tag such
 * as `"th-TH"`. `<GummyApp>` provides `project.locale` (or its `locale` prop);
 * a hand-wired app mounts `<LocaleProvider>` itself. Absent = the browser's.
 */
const LocaleContext = createContext<string | undefined>(undefined);

export function LocaleProvider({ locale, children }: { locale?: string; children: ReactNode }) {
  const trimmed = locale?.trim() || undefined;
  return <LocaleContext.Provider value={trimmed}>{children}</LocaleContext.Provider>;
}

/** The configured locale, or `undefined` (the browser's). */
export function useLocale(): string | undefined {
  return useContext(LocaleContext);
}
