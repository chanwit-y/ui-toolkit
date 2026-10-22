import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
// The library's compiled stylesheet: Radix Themes, the engine partials and
// every utility the components use. No Tailwind needed in this app.
import "@gummy-ui/ui/styles.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  // The router is the app's: <GummyApp> mounts inside it, like PageRouter, so
  // other routes can live beside the studio-authored pages.
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
