import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  AppShell,
  DataProvider,
  HttpClientFactory,
  PageRouter,
  ThemeProvider,
  ThemeToggle,
} from "@gummy-ui/ui";
import { model } from "./config/country/model";
import { api } from "./config/country/api";
import { pages } from "./config/country/pages";
import { menu } from "./config/country/menu";
import { theme, components } from "./config/theme";

const http = new HttpClientFactory(
  import.meta.env.VITE_API_URL ?? "",
  async () => "",
  "1.0.0",
  30000
);

/**
 * Replays a page-enter animation on every navigation. Keying the wrapper by the
 * route pathname forces a remount, so the CSS `.page-enter` animation restarts
 * each time the user lands on a new page. Kept outside `PageRouter` on purpose:
 * transitions are the consumer's policy, not the router's.
 */
function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}

function NotFound() {
  const { pathname } = useLocation();
  return (
    <div className="text-sm text-gray-500 dark:text-gray-400">
      No page matches <code className="font-mono">{pathname}</code>.{" "}
      <Link
        to="/"
        className="text-[var(--accent-11)] hover:text-[var(--accent-12)] underline underline-offset-2"
      >
        Back to the list
      </Link>
    </div>
  );
}

type Placement = "sidebar" | "top";

/** Demo switch for `AppShell.navigation` — the same menu as a sidebar or a top strip. */
function NavPlacementToggle({
  value,
  onChange,
}: {
  value: Placement;
  onChange: (v: Placement) => void;
}) {
  const options: { value: Placement; label: string }[] = [
    { value: "sidebar", label: "Side" },
    { value: "top", label: "Top" },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Navigation placement"
      className="inline-flex rounded-md border border-[var(--gray-6)] p-0.5 text-xs"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded px-2 py-0.5 ${
            value === o.value
              ? "bg-[var(--accent-9)] text-[var(--accent-contrast)]"
              : "text-[var(--gray-11)] hover:text-[var(--gray-12)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function AppContent() {
  const [navigation, setNavigation] = useState<Placement>("sidebar");
  return (
    // The shell owns the chrome: top bar (brand, collapse toggle, ThemeToggle)
    // and the menu from config/country/menu.ts — as a sidebar or, via the
    // toggle, a top strip. The breadcrumb strip follows `parent` in
    // config/country/pages.ts. Routes stay in PageRouter; the transition
    // wrapper is the consumer's, as before.
    <AppShell
      pages={pages}
      menu={menu}
      navigation={navigation}
      appBar={{
        title: "Gummy UI — Example",
        icon: "globe",
        sidebarToggle: { hide: "panelLeftClose", show: "panelLeftOpen" },
      }}
      header={
        <>
          <NavPlacementToggle value={navigation} onChange={setNavigation} />
          <ThemeToggle />
        </>
      }
      footer={<span className="text-xs">@gummy-ui/ui · example</span>}
    >
      <div className="p-8">
        <PageTransition>
          <PageRouter
            http={http as any}
            model={model}
            api={api}
            pages={pages}
            notFound={<NotFound />}
          />
        </PageTransition>
      </div>
    </AppShell>
  );
}

export function App() {
  return (
    <DataProvider>
      <ThemeProvider theme={theme} components={components}>
        <AppContent />
      </ThemeProvider>
    </DataProvider>
  );
}
