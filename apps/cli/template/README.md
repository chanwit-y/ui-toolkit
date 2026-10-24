# __NAME__

A Gummy UI app. The screens live in `gummy/projects/*.json` and are rendered at
runtime by `<GummyApp>` from `@gummy-ui/ui`; `src/` holds only what the JSON
cannot carry (the token getter, custom actions, custom components).

```bash
npm install
npm run dev       # the app (Vite)
npm run studio    # the studio, writing gummy/ on every save
```

- `src/App.tsx` mounts `<GummyApp>` inside the app's router.
- `src/project.ts` picks which `gummy/projects/<key>.json` to render (`VITE_GUMMY_PROJECT` to choose).
- `src/actions.ts` / `src/components.tsx` are the registries for `fn:<name>` actions and `custom` components.
- Sign-in (Azure SSO) is the project's `auth` block, picked on the studio's Env page: set the `VITE_AZURE_*` vars per environment, or `VITE_AUTH_MOCK_EMAIL` to sign a mock account in while there is no tenant (see `.env.example`).
- `gummy/workspace.json` is the studio's own state — commit it with the projects.
- `vite.config.mjs` proxies `/collection`, `/upload`, `/uploads` to `API_PROXY_TARGET` in dev; point the project's `API_URL` at your API otherwise.
