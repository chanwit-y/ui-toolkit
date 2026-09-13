import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  DataProvider,
  HttpClientFactory,
  PageRouter,
  ThemeProvider,
  ThemeToggle,
} from "@gummy-ui/ui";
import { model } from "./config/country/model";
import { api } from "./config/country/api";
import { pages } from "./config/country/pages";
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

function AppContent() {
  return (
    <>
      <header className="flex items-center justify-between px-8 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Gummy UI — Example
        </h1>
        <ThemeToggle />
      </header>
      <main className="p-8 flex-1 overflow-auto">
        <PageTransition>
          {/* Routes come from config/country/pages.ts; the pages' own buttons
              and the country table's row click do the navigating. */}
          <PageRouter
            http={http as any}
            model={model}
            api={api}
            pages={pages}
            notFound={<NotFound />}
          />
        </PageTransition>
      </main>
    </>
  );
}

export function App() {
  return (
    <DataProvider>
      <ThemeProvider
        theme={theme}
        components={components}
        className="flex flex-col w-full min-h-screen"
      >
        <AppContent />
      </ThemeProvider>
    </DataProvider>
  );
}
