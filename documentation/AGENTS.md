# Autistic.web

React 19 + TypeScript 6 PWA. Firebase (Firestore + Auth) backend. Tailwind v4, Vite 8, Vitest 4.

## Commands

| Command | Action |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc && vite build` (typecheck **before** build) |
| `npm run test` | Vitest watch mode |
| `npm run test:run` | Vitest single run |
| `npm run lint` | ESLint on `src/**/*.{ts,tsx}` |
| `npm run lint:fix` | ESLint + `--fix` |
| `npm run format` | Prettier `--write src` |

## Architecture

- **Entry**: `src/main.tsx` → `QueryClientProvider` + `BrowserRouter` → `App.tsx`
- **Layout**: `Sidebar` (desktop, `md:w-56`) + `BottomTabBar` (mobile) via `navConfig.ts`. Main content `md:ml-56 pb-16`.
- **Pages**: 7 routes in `src/pages/`. `Tasks` and `Sequences` are implemented; others (`Notes`, `Mood`, `Vitals`, `ScannedProducts`, `FoodCache`) are stubs. Default route `/` redirects to `/sequences`.
- **Data layer**: `src/repositories/` owns all Firestore queries. No business logic in API layer.
- **State**: @tanstack/react-query with 5min staleTime, no refetchOnWindowFocus.
- **Firebase**: initialized in `src/lib/firebase.ts`. Uses `import.meta.env.FIREBASE_*` — env vars must use the `FIREBASE_` prefix (configured in vite.config.ts via `envPrefix`).

## Conventions

- `src/hooks/` directory exists for custom hooks; create one per concern.
- `src/types/` for TS interfaces only.
- `src/test/setup.ts` referenced in vitest config but does not exist yet — create it with `import '@testing-library/jest-dom'` before writing tests.
- `src/counter.ts` is orphaned boilerplate; do not import it.
- ESLint: base `no-unused-vars` is off (delegated to `@typescript-eslint/no-unused-vars`). Unused vars flagged unless prefixed with `_`.
- **Sequences**: 3 step types (repetition, repeat_group, action). Uses `@dnd-kit` for drag-to-reorder in editor. `src/hooks/useSequences.ts` for React Query hooks. Step type picker in `src/components/StepTypePicker.tsx`, editor in `src/components/SequenceEditor.tsx`.
- TypeScript: strict mode, `verbatimModuleSyntax`, `noUnusedLocals`, `noUnusedParameters`.
