# AGENTS.md

This document provides guidelines for AI coding agents working on this dp2p project.

## Project Overview

A decentralized P2P social network built with SolidStart (SolidJS), TypeScript, Bun, SQLite, and Tauri. Supports both web (Cloudflare Workers) and native (Tauri) deployments.

## Build Commands

```bash
# Development
bun run dev                    # Web development server
bun run dev:native           # Tauri native development

# Building
bun run build                 # Full build with typecheck + lint
bun run build:native         # Native Tauri build

# Type checking and linting
bun run check               # Run tsc + eslint (required before commits)

# Testing
bun run test                # Run all Playwright tests
bun run test -- --reporter=list  # Run tests with list reporter
npx playwright test auth.test.ts  # Run specific test file
npx playwright test -g "登录"      # Run tests matching pattern

# Installation
bun install                # Install dependencies
bun run install:pre        # Build WASM modules
bun run install:post       # Tauri setup, DB schema, Playwright deps
bun run generate:db-schema # Generate Prisma schema and types
```

## Code Style Guidelines

### TypeScript

- **Strict mode enabled**: No `any`, no implicit `any`
- **Use `unknown` instead of `any`** for type-safe unknown values
- **Enable `verbatimModuleSyntax`**: Explicit imports/exports
- **No `noUncheckedSideEffectImports`**: Mark side-effect imports explicitly

### Naming Conventions

- **Variables/Functions**: `snake_case` (e.g., `users_actions`, `is_submitting`, `get_preview_avatar`)
- **Components**: `PascalCase` (e.g., `Login`, `MenuBar`, `UserInfoWindow`)
- **Interfaces**: `PascalCase` (e.g., `Init`, `Free`, `SQLiteModule`)
- **CSS classes**: `kebab-case` (e.g., `flex flex-col`, `btn btn-neutral`)
- **File names**: Match component/class name (e.g., `login.tsx`, `main_store.ts`)

### Imports

- Use `~/*` alias for imports from `./src` (e.g., `import { X } from "~/lib/endpoint"`)
- Group imports: external libraries first, then internal components/modules
- Named imports for SolidJS primitives: `createSignal`, `createResource`, `Show`, `For`, `Suspense`

### SolidJS Patterns

- Use signals: `const [state, set_state] = createSignal(initialValue)`
- Use resources: `const [data, { refetch }] = createResource(asyncFn)`
- Use stores: `const main_store = use_context(MainContext)`
- Components receive props, not context directly (use context in parent)
- Use `<Show>` and `<For>` for control flow, not array methods in JSX
- Use `keyed` prop on `<Show>` when accessing keyed data

### Error Handling

- Wrap async operations in try/catch
- Use `ErrorBoundary` component for error fallbacks
- Return `void | Promise<void>` for `init()` and `free()` methods
- Use explicit error messages: `configure({ message: "..." })` with ArkType

### Form Handling

- Use `@tanstack/solid-form` for forms
- Define schemas with `arktype` for validation
- Use `createForm` hook with validators

### Database

- Use `kysely` for type-safe SQL queries
- Use `QueryBuilder` for query building
- Use `Prisma` for schema management
- Raw SQL for migrations, Kysely for runtime queries

### CSS/Styling

- Use **Tailwind CSS v4** with `@tailwindcss/vite`
- Use **DaisyUI** components (e.g., `btn`, `fieldset`, `avatar`)
- DaisyUI theme: set `data-theme` attribute on `<html>`
- Use utility classes: `flex flex-col gap-2`, `absolute w-dvh h-dvh`

### File Organization

```
src/
├── app.tsx              # Root app with Router
├── app.css             # Global styles
├── entry-client.tsx    # Client entry
├── entry-server.tsx    # Server entry
├── components/
│   ├── ui/            # UI components (login, register, menu_bar)
│   ├── widgets/        # Reusable widgets (image, error, loading)
│   └── modal/         # Modal dialogs
├── lib/
│   ├── sqlite/         # SQLite adapters (web, native, interface)
│   ├── endpoint/       # P2P endpoint adapters
│   ├── query_builder.ts
│   └── types.ts
├── routes/
│   ├── (main)/         # Route group
│   └── (main)/index.tsx
├── stores/
│   ├── main.ts        # Main store implementation
│   ├── interface.ts   # Store interfaces
│   └── home.ts
└── generated/          # Generated types (Prisma/Kysely)
```

### ESLint Configuration

- Extends: ESLint recommended + TypeScript ESLint recommended
- Strict boolean expressions: `error`
- No unused locals/parameters: `true`
- Format code before committing

### Prettier Configuration

- Minimal config (`{}` in `.prettierrc`)
- Uses VSCode default Prettier settings
- Run Prettier on: `.ts`, `.tsx`, `.json`, `.jsonc`

## Environment Variables

- `VITE_*` and `TAURI_ENV_*` prefixes are exposed to client
- Server-side only: use in `entry-server.tsx` or API routes

## Rust/WASM Modules

- Located in `wasm/endpoint/` - built with `wasm-pack --target web`
- Native Tauri: `native/` directory
- Generate IPC bindings: `cargo run --bin generate_ipc_bindings`

## Testing with Playwright

- Test files in `tests/` directory
- Tests use `test.describe` for grouping
- Use `expect` for assertions
- WebServer automatically starts on `http://127.0.0.1:8787`
- Projects: Chromium and Firefox

## Additional Notes

- Uses **Cloudflare Module** preset for server
- SQLite WASM via `wa-sqlite` for web
- OPFS worker for file persistence in browser
- Tauri native app support
- Chinese UI text (simplified Chinese)
