# AGENTS.md

This document provides guidelines for AI agents working on the DP2P project.

## Project Overview

DP2P is a distributed peer-to-peer communication software - a cross-platform chat application built with:
- **Frontend**: SolidJS + Solid Start + Vinxi
- **Backend**: Rust (WebAssembly modules + Tauri native)
- **Database**: SQLite with Kysely ORM
- **Language**: TypeScript (ESNext)
- **Testing**: Playwright
- **Package Manager**: Bun

## Build/Lint/Test Commands

```bash
# Development
bun run dev                    # Start web dev server (Cloudflare Workers)
bun run dev:native             # Start Tauri native dev server

# Building
bun run build                  # Web build (runs check first)
bun run build:native           # Native Tauri build

# Type checking & Linting
bun run check                  # Run TypeScript compiler + ESLint

# Testing
bun run test                   # Run all Playwright tests
npx playwright test            # Run Playwright directly
npx playwright test auth.test.ts    # Run single test file
npx playwright test -g "登录"   # Run tests matching pattern
npx playwright test --project chromium  # Run on specific browser

# Database
bun run generate:db-schema     # Generate Prisma schema & db_schema.sql

# Installation (full setup)
bun run install:pre            # Build WASM module
bun install
bun run install:post           # Generate icons, IPC bindings, DB schema, Playwright
```

## Code Style Guidelines

### Imports and Path Aliases

- Use path aliases: `~/*` maps to `./src/*`
- Example: `import { use_context } from "~/lib/context"`
- Group imports: external libs first, then local imports
- Type imports use `import type` when only types are needed

```typescript
import { createSignal, Show, For } from "solid-js";
import { useNavigate } from "@solidjs/router";
import type { User } from "~/types";
import MainStore from "~/stores/main";
```

### TypeScript Configuration

Strict mode is enabled. Key settings in `tsconfig.json`:
- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `verbatimModuleSyntax: true`

Always define types explicitly. Use `type` keyword for type-only imports.

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | snake_case | `main_store.ts`, `query_builder.ts` |
| Components (React/Solid) | PascalCase | `Login.tsx`, `UserInfoWindow.tsx` |
| Functions/Variables | camelCase | `handleSubmit`, `isSubmitting` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Classes | PascalCase | `MainStore`, `SQLiteModule` |
| Database tables/columns | snake_case | `user_id`, `created_at` |

### Component Patterns (SolidJS)

```typescript
// Use createSignal for local state
const [count, setCount] = createSignal(0);

// Use createResource for async data
const [users] = createResource(async () => await fetchUsers());

// Use Show and For for control flow (not ternary in JSX)
<Show when={loading()} fallback={<Content />}>
  <Loading />
</Show>

<For each={items()}>{(item) => <Item value={item} />}</For>

// Use createForm from @tanstack/solid-form for forms
const form = createForm(() => ({
  defaultValues: { user_id: "" },
  onSubmit: ({ value }) => handleSubmit(value),
}));
```

### Validation

Use **ArkType** for runtime validation (not Zod):

```typescript
import { type } from "arktype";

const UserSchema = type({
  id: "string",
  name: type("string").configure({ message: "用户名不能为空" }),
});
```

### Database (Kysely + SQLite)

```typescript
import { Kysely } from "kysely";
import { QueryBuilder } from "~/lib/query_builder";

const results = await db
  .selectFrom("user")
  .select(["id", "name"])
  .where("id", "=", userId)
  .execute();
```

### Error Handling

- Use try/catch for async operations
- Throw errors with descriptive Chinese messages
- Use `use_context()` helper that throws if context is undefined

```typescript
try {
  await operation();
} catch (error) {
  console.error("操作失败:", error);
  throw new Error("操作失败，请重试");
}
```

### Async/Await Patterns

- Always await async operations
- Handle errors appropriately
- ESLint rule `@typescript-eslint/no-misused-promises` is disabled (use carefully)

### CSS/Styling

- Use Tailwind CSS v4 with DaisyUI components
- Component classes: `class="flex flex-col gap-4 p-4"`
- DaisyUI component classes: `btn btn-neutral`, `select select-bordered`
- Theme classes: `text-base-content`, `bg-base-100`

### File Organization

```
src/
├── components/
│   ├── ui/           # Feature components (Login, Register, etc.)
│   ├── modal/        # Modal dialogs
│   ├── widgets/      # Reusable widgets (Image, Loading, Error)
│   └── context.tsx   # Context providers
├── lib/
│   ├── sqlite/       # SQLite adapters (native, web)
│   ├── endpoint/     # P2P endpoint module
│   ├── types.ts      # Shared types
│   ├── sqlite.ts     # SQLite module adapter
│   └── query_builder.ts  # Kysely instance
├── stores/
│   ├── main.ts       # MainStore (app initialization)
│   ├── home.ts       # HomeStore (chat features)
│   └── interface.ts  # Store interfaces
├── app.config.ts     # Vinxi app config
└── type.d.ts         # TypeScript declarations
```

### ESLint Configuration

```bash
bun run check  # Runs tsc && eslint src
```

Rules enforced:
- Strict boolean expressions
- No unused locals/parameters
- Recommended ESLint + TypeScript rules

### Testing with Playwright

```typescript
import test, { expect } from "@playwright/test";

test.describe("Feature Name", () => {
  test("should do something", async ({ page }) => {
    await page.goto("/");
    // assertions with expect
    await expect(page.locator("text=目标")).toBeVisible();
  });
});
```

### Conditional Imports (Platform Detection)

Use `import.meta.env.TAURI_ENV_PLATFORM` for platform-specific code:

```typescript
if (import.meta.env.TAURI_ENV_PLATFORM !== undefined) {
  const mod = await import("./sqlite/native");
  SQLiteModuleAdapter = mod.SQLiteModuleImpl;
} else {
  const mod = await import("./sqlite/web");
  SQLiteModuleAdapter = mod.SQLiteModuleImpl;
}
```

### Context Usage

Always use the `use_context()` helper for SolidJS contexts:

```typescript
import { use_context, MainContext } from "~/components/context";

const mainStore = use_context(MainContext);
```

### Commit Message Style

Follow conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `refactor:` Code refactoring
- `docs:` Documentation changes
- `chore:` Maintenance tasks

Example: `feat(ui): add user avatar display in login form`
