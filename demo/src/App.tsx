import { GummyApp, ThemeToggle, type GummyProject } from "@gummy-ui/ui";
import project from "../gummy/projects/demo.json";
import { actions } from "./actions";
import { components } from "./components";

/** The signed-in user's bearer token; wire your auth (MSAL, a cookie exchange…) here. */
const getToken = async () => "";

/**
 * The whole app is the studio's project document rendered by the engine.
 * `gummy/projects/demo.json` is what `gummy studio` writes on save; the only
 * code this app owns is what the JSON cannot carry — the token getter, the
 * custom actions and the custom components.
 */
export function App() {
  return (
    <GummyApp
      project={project as GummyProject}
      getToken={getToken}
      // Per-environment settings override the project's `env` (API_URL is the HTTP base URL).
      env={{ API_URL: import.meta.env.VITE_API_URL ?? "" }}
      actions={actions}
      components={components}
      header={<ThemeToggle />}
      footer={<span className="text-xs">gummy-demo</span>}
    />
  );
}
