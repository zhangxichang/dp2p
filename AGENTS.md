# AGENTS.md

This document provides guidelines for AI agents working on this codebase.

## Build Commands

```bash
bun run check              # TypeScript check + ESLint
bun run build              # Full production build
bun run dev                # Start development server
bun run dev:native         # Start Tauri native app dev server
bun run build:native       # Build Tauri native app
bun run preview            # Preview Cloudflare Workers deployment
```

## Test Commands

```bash
bun run test               # Run all Playwright tests
npx playwright test tests/auth.test.ts                    # Run single test file
npx playwright test tests/auth.test.ts -t "有头像完整流程"  # Run specific test by name
npx playwright test --project=chrome                     # Run in Chrome only
```

**Test setup requirements:**
- Preview server runs on `http://127.0.0.1:8787`
- Tests use Chinese descriptions (e.g., "有头像完整流程")
- Failed tests save screenshots to `test-results/`

## Code Style Guidelines

### Naming Conventions

```typescript
// Variables and functions: snake_case
const secret_key = await generate_secret_key();
function get_user_info() { ... }

// Components: PascalCase
import Register from "../ui/register";
import Login from "../ui/login";

// Properties in objects: camelCase
const user = { userName: "john", avatarUrl: "/path" };
```

### Imports

- Use absolute imports with `~/*` alias:
  ```typescript
  import { DB } from "~/generated/db_schema";
  import { QueryBuilder } from "~/lib/query_builder";
  ```
- Group imports by category (external, internal):
  ```typescript
  import { For, Show } from "solid-js";
  import { createForm } from "@tanstack/solid-form";
  import { QueryBuilder } from "~/lib/query_builder";
  import { MainContext, use_context } from "../context";
  ```

### TypeScript

- Enable strict mode: `strict: true` in tsconfig.json
- Use ArkType for runtime validation:
  ```typescript
  import { type } from "arktype";
  const FormSchema = type({
    user_name: type("string > 0").configure({ message: "用户名不能为空" }),
  });
  ```
- Explicitly type async functions and complex objects
- Use `unknown` instead of `any` when type is unknown

### Error Handling

- Log errors with `console.error()` in components
- Use `ErrorBoundary` from `solid-js` for component-level error catching:
  ```typescript
  <ErrorBoundary fallback={(error) => <Error error={error as Error} />}>
    <Suspense fallback={<Loading />}>{props.children}</Suspense>
  </ErrorBoundary>
  ```
- Throw descriptive errors for missing context:
  ```typescript
  if (store === undefined) throw new Error("上下文不存在");
  ```

### SolidJS Patterns

- Use `createForm` from `@tanstack/solid-form` for forms
- Use `Show` for conditional rendering, `For` for lists
- Use `Suspense` for async operations with fallback
- Use `use_context()` helper for context access:
  ```typescript
  const main_store = use_context(MainContext);
  ```

### Database (Prisma/Kysely)

- Database schema in `schema.prisma`
- Generated types in `src/generated/db_schema.ts`
- Use `QueryBuilder` from `~/lib/query_builder` for queries:
  ```typescript
  await main_store.sqlite.query(
    QueryBuilder.selectFrom("user")
      .selectAll()
      .where("id", "=", user_id)
      .compile(),
  );
  ```

### Styling

- Tailwind CSS v4 with daisyUI theme
- Custom theme defined in `src/app.css` with CSS `@plugin` syntax
- Use DaisyUI component classes: `btn`, `input`, `select`, `modal`, etc.
- Custom colors defined with oklch color space

### Comments

- Write comments and error messages in Chinese
- Avoid unnecessary comments on obvious logic
- Document complex algorithms and non-obvious decisions
- Use JSDoc for exported functions when helpful

### File Organization

```
src/
├── app.tsx              # App shell with Router
├── app.css              # Tailwind + daisyUI theme
├── components/
│   ├── ui/             # UI components (login, register, sidebar, etc.)
│   ├── widgets/        # Reusable widgets (error, loading, image)
│   └── modal/          # Modal dialogs
├── lib/                # Core libraries (sqlite, endpoint, query_builder)
├── stores/             # State stores (main, home)
├── routes/             # Page routes
└── generated/          # Auto-generated code (Prisma/Kysely)
tests/                  # Playwright E2E tests
```

### Environment Variables

- Prefix: `VITE_` or `TAURI_ENV_` for client-side env vars
- Check for Tauri environment:
  ```typescript
  if (import.meta.env.TAURI_ENV_PLATFORM !== undefined) { ... }
  ```

### Key Technologies

- **Framework**: SolidJS with SolidStart
- **Runtime**: Bun
- **Database**: SQLite with Prisma + Kysely
- **Styling**: Tailwind CSS v4 + daisyUI
- **Testing**: Playwright
- **Native**: Tauri
- **Deployment**: Cloudflare Workers (Wrangler)
