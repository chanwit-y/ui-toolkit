import React, { useMemo } from "react";
import {
  Core,
  DataProvider,
  HttpClientFactory,
  ThemeProvider,
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
    <main className="p-8 flex-1 overflow-auto">
      {ui}
    </main>
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
