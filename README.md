# Gummy UI

A Bun monorepo for the Gummy UI component library.

## Workspace structure

```
gummy-ui/
├── packages/
│   └── ui/          # @gummy-ui/ui — component library
└── apps/
    ├── studio/      # @gummy-ui/studio — live prop editor (port 3100)
    ├── cli/         # @gummy-ui/cli   — opens Studio from the terminal
    └── example/     # @gummy-ui/example — demo app (port 3200)
```

## Getting started

```bash
bun install
```

## To run each part

| Command | What it does |
|---|---|
| `bun run studio` | Start Studio at `localhost:3100` — live prop editor |
| `bun run example` | Start example app at `localhost:3200` |
| `bun run --filter @gummy-ui/cli start` | CLI — starts Studio + opens browser |
| `bun run --filter @gummy-ui/ui build` | Build the library |
