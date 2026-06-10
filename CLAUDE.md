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

```bash
# Install dependencies
bun install

# Development
bun run dev              # Run UI library and example app in parallel
bun run example          # Run only example app (port 3200)
bun run studio           # Run Studio (port 3100) - if available

# Build
bun run build            # Build all packages
bun run --filter @gummy-ui/ui build    # Build UI library only

# Type checking
bun run --filter @gummy-ui/ui typecheck  # Run TypeScript checks on UI library
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

- Run `bun run --filter @gummy-ui/ui typecheck` before committing
- Ensure no TypeScript errors
- Test components in the example app before finalizing changes

## Important Files

- packages/ui/src/index.ts - Main library exports
- packages/ui/tsup.config.ts - Build configuration
- packages/ui/tailwind.config.js - Tailwind configuration
- apps/example/src/App.tsx - Example app showcase