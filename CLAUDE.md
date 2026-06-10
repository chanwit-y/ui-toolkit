# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a Bun-based monorepo for the Gummy UI component library - a comprehensive React component library built with TypeScript, Tailwind CSS, and modern web technologies. It provides a complete solution for building enterprise React applications with authentication, data management, and a rich set of UI components.

## Workspace Structure

- **packages/ui** - Core component library (@gummy-ui/ui)
  - Components built with React, Radix UI, and Tailwind CSS
  - Form components with React Hook Form and Zod validation
  - Data table with TanStack Table
  - Azure MSAL authentication integration
  - API client with Axios and React Query
  
- **apps/example** - Demo application (port 3200)
  - Vite-based React app showcasing UI components

## Development Commands

**Important**: Always use `rtk` prefix for commands to reduce token usage (60-90% savings).

```bash
# Install dependencies
rtk bun install

# Development
rtk bun run dev              # Run UI library and example app in parallel
rtk bun run example          # Run only example app (port 3200)
rtk bun run studio           # Run Studio (port 3100) - if available

# Build
rtk bun run build            # Build all packages
rtk bun run --filter @gummy-ui/ui build    # Build UI library only

# Type checking
rtk bun run --filter @gummy-ui/ui typecheck  # Run TypeScript checks on UI library
```

## Architecture

### UI Library (@gummy-ui/ui)

#### Tech Stack
- **React 18+** with TypeScript
- **Tailwind CSS** + **Radix UI** for accessible primitives
- **React Hook Form** + **Zod** for form validation
- **TanStack Table** for data grids
- **TanStack Query** for server state management
- **Azure MSAL** for authentication
- **Zustand** for state management
- **Axios** for HTTP requests
- **dnd-kit** for drag-and-drop functionality
- **RxJS** for reactive patterns

#### Project Structure
- **Entry point**: packages/ui/src/index.ts
- **Build tool**: tsup (ESM output with TypeScript declarations)
- **Components**: packages/ui/src/components/
  - form/ - Form components with validation
  - core/ - Core utilities and builders
  - context/ - React context providers
  - date-picker/ - Date picker components
  - datetime-picker/ - DateTime picker components
- **API layer**: packages/ui/src/api/ - HTTP client factory with interceptors
- **Auth**: packages/ui/src/auth/azure/ - MSAL authentication wrapper
- **Models**: packages/ui/src/model/ - Data models and converters
- **State management**: Zustand stores in packages/ui/src/store/
- **Utilities**: packages/ui/src/util/ - Helper functions and constants
- **Styles**: packages/ui/src/styles.css - Tailwind CSS base styles

#### Key Components

**Forms**
- TextField - Text input with validation support
- SelectField - Dropdown selection
- Checkbox - Checkbox with label
- RadioButton - Radio button groups
- DatePicker - Date selection
- DateTimePicker - Date and time selection
- Autocomplete - Searchable dropdown with async data loading
- MultiAutocomplete - Multiple selection autocomplete
- Textarea - Multi-line text input
- Hidden - Hidden form fields

**Data Display**
- DataTable/DataTable2 - Feature-rich data grid with:
  - Sorting
  - Filtering
  - Pagination
  - Column resizing
  - Row selection

**Feedback & Overlays**
- Modal - Dialog windows
- ConfirmBox - Confirmation dialogs
- Snackbar - Toast notifications
- Popover - Contextual overlays
- Badge - Status indicators

**Layout**
- Container/Grid system with responsive design
- Drag-and-drop support via dnd-kit
- Card - Content containers
- Hidden - Conditional rendering utility

**Other Components**
- Icon - Icon component with Lucide React
- Text - Typography component
- Button - Button with variants
- FilterIcon - Filter icon component

#### Architecture Features
- **API Factory Pattern** - Centralized HTTP client (APIFactory.ts) with interceptors
- **Authentication** - Azure AD integration with MSAL wrapper
- **Context Providers** - Theme, loading states, and data management (LoadingProvider, ThemeProvider, DataProvider)
- **Schema Validation** - TypeBox and Zod for runtime validation
- **Reactive Patterns** - RxJS observables for complex state flows
- **HOC Pattern** - Higher-order components (withForm) for enhanced functionality

### Development Notes

- The monorepo uses Bun workspaces (no Lerna/Nx/pnpm)
- Components export both from individual files and barrel exports
- CSS must be imported separately as "@gummy-ui/ui/styles.css"
- TypeScript strict mode is enabled
- ESM modules only (no CommonJS)
- All components are built with accessibility in mind using Radix UI primitives
- Form components integrate with React Hook Form for validation
- Data fetching uses TanStack Query for caching and synchronization

## Code Style Guidelines

When modifying or adding code:
1. Follow existing patterns in the codebase
2. Use TypeScript strict typing
3. Prefer functional components with hooks
4. Use Tailwind CSS for styling (avoid inline styles)
5. Ensure components are accessible (use Radix UI primitives when available)
6. Add proper TypeScript types for all props
7. Use Zod schemas for runtime validation where appropriate
8. Follow the existing file naming conventions (PascalCase for components, camelCase for utilities)

## Testing & Quality

**Important**: Use `rtk` prefix for all commands to save 60-90% tokens.

- Run `rtk bun run --filter @gummy-ui/ui typecheck` before committing
- Ensure no TypeScript errors
- Test components in the example app before finalizing changes
- Use `rtk git status` and `rtk git diff` for compact git output
- Use `rtk test` for test commands to see only failures

## Important Files

- packages/ui/src/index.ts - Main library exports
- packages/ui/tsup.config.ts - Build configuration
- packages/ui/tailwind.config.js - Tailwind configuration
- apps/example/src/App.tsx - Example app showcase

<!-- rtk-instructions v2 -->
# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)
```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (60-99% savings)
```bash
rtk cargo test          # Cargo test failures only (90%)
rtk go test             # Go test failures only (90%)
rtk jest                # Jest failures only (99.5%)
rtk vitest              # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk pytest              # Python test failures only (90%)
rtk rake test           # Ruby test failures only (90%)
rtk rspec               # RSpec test failures only (60%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)
```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)
```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)
```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)
```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%). Format flags (-c, -l, -L, -o, -Z) run raw.
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)
```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)
```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)
```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands
```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
|----------|----------|-----------------|
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->