import React, { useMemo } from "react";
import {
  Core,
  DataProvider,
  HttpClientFactory,
  ThemeProvider,
  ThemeToggle,
} from "@gummy-ui/ui";
import { model } from "./config/country/model";
import { api } from "./config/country/api";
import { containerCountryList } from "./config/country/container";
import { theme, components } from "./config/theme";

const http = new HttpClientFactory(
  import.meta.env.VITE_API_URL ?? "",
  async () => "",
  "1.0.0",
  30000
);

function AppContent() {
  const ui = useMemo(
    () => new Core(http as any, model, api, containerCountryList).run(),
    []
  );

  return (
    <>
      <header className="flex items-center justify-between px-8 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Gummy UI — Example
        </h1>
        <ThemeToggle />
      </header>
      <main className="p-8 flex-1 overflow-auto">
        {ui}
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
