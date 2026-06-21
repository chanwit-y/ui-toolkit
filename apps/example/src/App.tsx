import React, { useMemo } from "react";
import { Link, Route, Routes, useLocation, useParams } from "react-router-dom";
import {
  Core,
  DataProvider,
  HttpClientFactory,
  ThemeProvider,
  ThemeToggle,
} from "@gummy-ui/ui";
import { model } from "./config/country/model";
import { api } from "./config/country/api";
import {
  containerCountryList,
  containerCountryStateDetail,
} from "./config/country/container";
import { theme, components } from "./config/theme";

const http = new HttpClientFactory(
  import.meta.env.VITE_API_URL ?? "",
  async () => "",
  "1.0.0",
  30000
);

function ListPage() {
  const ui = useMemo(
    () => new Core(http as any, model, api, containerCountryList).run(),
    []
  );
  return (
    <>
      <nav className="mb-4 flex gap-3 text-sm">
        <span className="text-gray-500 dark:text-gray-400">
          State-loader demo →
        </span>
        {["1", "3", "12"].map((id) => (
          <Link
            key={id}
            to={`/country/${id}`}
            className="text-[var(--accent-11)] hover:text-[var(--accent-12)] underline underline-offset-2"
          >
            /country/{id}
          </Link>
        ))}
      </nav>
      {ui}
    </>
  );
}

function DetailPage() {
  // Re-run Core per :id so react-query inside the loader keys off the new param.
  const { id } = useParams();
  const ui = useMemo(
    () => new Core(http as any, model, api, containerCountryStateDetail).run(),
    []
  );
  return (
    <>
      <nav className="mb-4 flex items-center gap-3 text-sm">
        <Link
          to="/"
          className="text-[var(--accent-11)] hover:text-[var(--accent-12)] underline underline-offset-2"
        >
          ← Back to list
        </Link>
        <span className="text-gray-500 dark:text-gray-400">
          loading country id <code className="font-mono">{id}</code> into global
          state
        </span>
        {["1", "3", "12"].map((next) => (
          <Link
            key={next}
            to={`/country/${next}`}
            className="text-[var(--accent-11)] hover:text-[var(--accent-12)] underline underline-offset-2"
          >
            {next}
          </Link>
        ))}
      </nav>
      {ui}
    </>
  );
}

/**
 * Replays a page-enter animation on every navigation. Keying the wrapper by the
 * route pathname forces a remount, so the CSS `.page-enter` animation restarts
 * each time the user lands on a new page.
 */
function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="page-enter">
      {children}
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
          <Routes>
            <Route path="/" element={<ListPage />} />
            <Route path="/country/:id" element={<DetailPage />} />
          </Routes>
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
