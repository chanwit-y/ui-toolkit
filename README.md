# Gummy UI Toolkit

A comprehensive React component library built with TypeScript, Tailwind CSS, and modern web technologies. This monorepo provides a complete solution for building enterprise React applications with authentication, data management, and a rich set of UI components.

## 📦 Architecture

- **Monorepo Setup**: Uses Bun workspaces for efficient package management
- **Packages**:
  - `packages/ui` - Core component library (@gummy-ui/ui)
  - `apps/example` - Demo application showcasing components (port 3200)

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh/) runtime installed
- Node.js 18+ (for compatibility)

### Installation

```bash
# Install dependencies
bun install

# Run development mode (UI library + example app)
bun run dev

# Run example app only
bun run example
```

## 🎨 UI Library (@gummy-ui/ui)

### Tech Stack

- **React 18+** with TypeScript
- **Tailwind CSS** + **Radix UI** for accessible primitives
- **React Hook Form** + **Zod** for form validation
- **TanStack Table** for data grids
- **TanStack Query** for server state management
- **Azure MSAL** for authentication
- **Zustand** for state management
- **Axios** for HTTP requests
- **dnd-kit** for drag-and-drop functionality

### Key Components

#### Forms
- `TextField` - Text input with validation support
- `SelectField` - Dropdown selection
- `Checkbox` - Checkbox with label
- `RadioButton` - Radio button groups
- `DatePicker` - Date selection
- `DateTimePicker` - Date and time selection
- `Autocomplete` - Searchable dropdown with async data loading
- `MultiAutocomplete` - Multiple selection autocomplete

#### Data Display
- `DataTable`/`DataTable2` - Feature-rich data grid with:
  - Sorting
  - Filtering
  - Pagination
  - Column resizing
  - Row selection

#### Feedback & Overlays
- `Modal` - Dialog windows
- `ConfirmBox` - Confirmation dialogs
- `Snackbar` - Toast notifications
- `Popover` - Contextual overlays
- `Badge` - Status indicators

#### Layout
- Container/Grid system with responsive design
- Drag-and-drop support via dnd-kit
- `Card` - Content containers
- `Hidden` - Conditional rendering utility

#### Other Components
- `Icon` - Icon component with Lucide React
- `Text` - Typography component
- `Button` - Button with variants

### Architecture Features

- **API Factory Pattern** - Centralized HTTP client with interceptors
- **Authentication** - Azure AD integration with MSAL wrapper
- **Context Providers** - Theme, loading states, and data management
- **Schema Validation** - TypeBox and Zod for runtime validation
- **Reactive Patterns** - RxJS observables for complex state flows

## 🛠️ Development

### Commands

```bash
# Development
bun run dev                              # Run UI library and example app
bun run example                          # Run only example app (port 3200)
bun run studio                          # Run Studio app (port 3100) if available

# Build
bun run build                           # Build all packages
bun run --filter @gummy-ui/ui build    # Build UI library only

# Type Checking
bun run --filter @gummy-ui/ui typecheck  # Run TypeScript checks
```

### Project Structure

```
ui-toolkit/
├── packages/
│   └── ui/                    # Component library
│       ├── src/
│       │   ├── components/    # UI components
│       │   │   ├── form/     # Form components
│       │   │   ├── core/     # Core utilities
│       │   │   └── context/  # React contexts
│       │   ├── api/          # HTTP client & API layer
│       │   ├── auth/         # Authentication (Azure MSAL)
│       │   ├── model/        # Data models & converters
│       │   └── util/         # Utilities
│       ├── package.json
│       └── tsup.config.ts    # Build configuration
├── apps/
│   └── example/              # Demo application
│       ├── src/
│       └── package.json
├── package.json             # Root workspace config
├── tsconfig.json           # TypeScript config
└── bun.lockb              # Lock file
```

## 📚 Usage

### Basic Example

```tsx
import { Button, TextField, Form } from '@gummy-ui/ui';
import '@gummy-ui/ui/styles.css'; // Required for styles

function MyForm() {
  return (
    <Form onSubmit={handleSubmit}>
      <TextField 
        name="email" 
        label="Email"
        required 
      />
      <Button type="submit">Submit</Button>
    </Form>
  );
}
```

### Data Table Example

```tsx
import { DataTable } from '@gummy-ui/ui';

function MyTable() {
  const columns = [
    { accessorKey: 'id', header: 'ID' },
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'email', header: 'Email' }
  ];

  return (
    <DataTable 
      data={users}
      columns={columns}
      pagination
      filtering
      sorting
    />
  );
}
```

### Authentication Setup

```tsx
import { getAccessToken } from '@gummy-ui/ui';

// Get Azure AD token
const token = await getAccessToken();

// Use with API Factory
import { ApiFactory } from '@gummy-ui/ui';

const api = ApiFactory.create({
  baseURL: 'https://api.example.com',
  auth: { type: 'bearer', token }
});
```

## 🏗️ Build System

- **UI Library**: Uses `tsup` for ESM output with TypeScript declarations
- **Example App**: Vite-based React application for fast development
- **Styling**: PostCSS with Tailwind CSS
  - Styles exported separately as `@gummy-ui/ui/styles.css`
  - Must be imported in your application

## 🔧 Configuration

### TypeScript
- Strict mode enabled
- Module resolution set to "bundler"
- Target ES2020

### Tailwind CSS
- Custom theme configuration available
- Radix Colors integration
- Responsive design utilities

## 🔄 Migration Guide

### DataProvider Changes (Breaking)
The `DataProvider` component has been integrated into the Core Provider and is no longer available as a standalone component.

**Before:**
```jsx
import { DataProvider } from "@gummy-ui/ui";

<DataProvider>
  {/* Your components */}
</DataProvider>
```

**After:**
```jsx
import { Core } from "@gummy-ui/ui";

// DataProvider is now automatically included when using Core.Provider with isRoot=true
<Core.Provider isRoot={true}>
  {/* Your components */}
</Core.Provider>
```

**Note:** If you were using `DataProvider` separately, remove the import and wrapper. The functionality is now included in the Core Provider when `isRoot` is set to true.

## 📄 License

Private - See package.json for details

## 🤝 Contributing

This is currently a private repository. Please contact the maintainers for contribution guidelines.

## 📞 Support

For issues and questions, please contact the development team or create an issue in the repository.