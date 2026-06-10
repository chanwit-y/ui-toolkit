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

const http = new HttpClientFactory(
  import.meta.env.VITE_API_URL ?? "http://localhost:3001",
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
        components={{
          button: { color: "violet" },
          dataTable: {
            headerColor: "violet",
            editButtonColor: "violet",
            deleteButtonColor: "violet",
            headerHoverColor: "violet",
            paginationButtonColor: "violet",
            rowHoverColor: "violet",
            paginationButtonHoverColor: "violet",
          },
        }}
        className="flex flex-col w-full min-h-screen"
      >
        <AppContent />
      </ThemeProvider>
    </DataProvider>
  );
}
