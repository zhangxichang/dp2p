# DP2P Agent Guidelines

## Build/Lint/Test Commands

### Development
```bash
bun run dev              # Dev server (Vinxi)
bun run dev:native       # Native desktop (Tauri)
bun run build            # Production build with type check
bun run build:native     # Native desktop build
bun run preview          # Cloudflare Workers preview
```

### Testing
```bash
bun run test                              # Run all Playwright tests
bun run test -t "test title"              # Run single test by title
bun run test --project=chrome tests/ui.test.ts  # Run specific file
bun run test:ui                           # Tests with UI
bun run test:report                       # Show test report
```

### Dependencies
```bash
bun run build:deps        # Build Rust endpoint
bun run generate:deps     # Generate all dependencies
bun run check             # TypeScript + ESLint validation
```

## Code Style Guidelines

### TypeScript/JavaScript
- **Formatting**: Prettier (VS Code default)
- **Linting**: ESLint with TypeScript rules
- **Strict Mode**: Enabled
- **Module System**: ES Modules (`type: "module"`)
- **Path Alias**: `~` → `./src/`

### Import Order
```typescript
// 1. Type imports first
import type { Endpoint, EndpointModule } from "./interface";

// 2. Standard library
import { createSignal, onMount } from "solid-js";

// 3. Third-party
import { QueryBuilder } from "~/lib/query_builder";

// 4. Internal (use ~ alias)
import { MainStore } from "~/stores/main";
```

### Naming Conventions
| Category | Convention | Examples |
|----------|------------|----------|
| Components | PascalCase | `Login.tsx`, `FriendList.tsx` |
| Stores | PascalCase | `MainStore.ts`, `HomeStore.ts` |
| Utilities | camelCase | `query_builder.ts`, `endpoint.ts` |
| Routes | kebab-case | `home[user_id].tsx` |
| Constants | UPPER_SNAKE_CASE |
| Variables/Functions | camelCase |

### TypeScript Rules
- Use `strict: true` in tsconfig
- Enable `noUnusedLocals: true`, `noUnusedParameters: true`
- Explicit types for parameters and return values
- Use `import type { X } from "y"` for type imports

### Error Handling
```typescript
// Context validation
export function use_context<T>(context: Context<T | undefined>) {
  const store = useContext(context);
  if (store === undefined) throw new Error("上下文不存在");
  return store;
}

// SolidJS error boundaries
<ErrorBoundary fallback={(error) => <Error error={error as Error} />}>
  <Suspense fallback={<Loading />}>{props.children}</Suspense>
</ErrorBoundary>
```

## Architecture Patterns

### Store Pattern
```typescript
export interface Store {
  cleanup(): Promise<void>;
}

export class MainStore implements Store {
  static async new() {
    return new MainStore(sqlite_module, endpoint_module, sqlite);
  }
  async cleanup() { /* cleanup */ }
}
```

### Platform Abstraction
```typescript
export let EndpointModuleAdapter:
  | typeof import("./endpoint/native")["EndpointModuleImpl"]
  | typeof import("./endpoint/web")["EndpointModuleImpl"];

if (import.meta.env.TAURI_ENV_PLATFORM !== undefined) {
  // Native implementation
} else {
  // Web implementation
}
```

## Technology Stack
- **Frontend**: SolidJS 1.9.10, TypeScript (strict), Tailwind CSS 4, DaisyUI
- **Backend**: Rust (2024 edition), WebAssembly, SQLite, Tauri
- **Database**: Kysely query builder, Prisma
- **Testing**: Playwright (E2E), Cloudflare Workers

## Important Notes
1. Always use `~` for src imports
2. Implement error boundaries in SolidJS components
3. Validate context in store hooks before use
4. Implement `cleanup()` methods in stores
5. Run `bun run check` before committing
