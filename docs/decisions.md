# Decisions

## Why React 19?

- Ecosystem maturity and developer familiarity
- Concurrent features for better UX during data loading
- `react-jsx` transform eliminates manual React imports
- Strong TypeScript support via `@types/react`

## Why TypeScript 6?

- Type safety across the entire codebase
- `strict: true` catches bugs at compile time
- `verbatimModuleSyntax` enforces explicit type imports
- Interface-first design for Firestore data models

## Why Firebase (Firestore + Auth)?

- **Shared backend with Android app** — Both apps read/write the same Firestore collections. This was the primary decision driver.
- **Google Sign-In** — Same account across web and Android, no custom auth infrastructure.
- **Real-time sync potential** — Firestore supports `onSnapshot` listeners (not currently used, but available).
- **Free tier** — Sufficient for personal use (50K reads/day, 20K writes/day).
- **No server to manage** — Serverless backend reduces operational overhead.

## Why TanStack Query (React Query)?

- **Cache management** for Firestore reads without manual state management
- **Invalidation pattern** — Mutations invalidate query keys, automatically refreshing stale data
- **Loading/error states** — Built-in `isLoading`, `error` handling per query
- **5-minute staleTime** — Balances freshness with reduced Firestore reads
- **No refetchOnWindowFocus** — Prevents unnecessary reads when switching tabs

## Why Tailwind CSS v4?

- **Rapid prototyping** — Utility classes speed up UI development
- **No CSS-in-JS runtime** — Better performance than styled-components/emotion
- **Responsive design** — `md:` breakpoint classes for sidebar/bottom-bar layout
- **Consistent spacing** — Built-in spacing scale prevents ad-hoc values
- **`@tailwindcss/vite` plugin** — Native Vite integration, no PostCSS config needed

## Why Vite 8?

- **Fast dev server** — Sub-second HMR
- **ESM-native** — No bundling in dev mode
- **`@vitejs/plugin-react`** — Official React support with fast refresh
- **`envPrefix`** — Clean environment variable handling for Firebase config
- **PWA support** via `vite-plugin-pwa`

## Why React Router v7?

- **Client-side routing** for SPA — no SSR needed
- **Simple flat route structure** — all routes at top level
- **`Navigate` component** for default redirect (`/` → `/sequences`)
- **`NavLink`** for active state styling in navigation

## Why @dnd-kit?

- **Accessible drag-and-drop** — Keyboard and screen reader support
- **Sortable context** — Simple API for list reordering
- **Pointer sensor** with distance activation — Prevents accidental drags
- **Lightweight** — Smaller bundle than react-beautiful-dnd

## Why Repository Pattern?

- **Separation of concerns** — Firestore queries isolated from UI logic
- **Testability** — Repository functions can be mocked for component tests
- **Single source of truth** — All Firestore access through one layer
- **No business logic in API layer** — Repositories only read/write data

## Why Soft Delete?

- **Android app compatibility** — Both apps need to agree on document state
- **Audit trail** — Deleted data preserved for potential recovery
- **Query consistency** — `where('isDeleted', '==', false)` filter is uniform
- **No cascade issues** — Step documents survive sequence deletion

## Why Local State (No Global Store)?

- **Simplicity** — No Redux/Zustand boilerplate
- **React Query handles server state** — Most app state is server-derived
- **Page-scoped state** — View toggles, form values, expanded states are page-local
- **Fewer re-renders** — No global store subscriptions

## Why No Component Library (shadcn/ui)?

- **`web.md` mentions shadcn/ui** but it was never installed
- **Tailwind utility classes** provide sufficient styling primitives
- **Custom components** give full control over appearance and behavior
- **Smaller bundle** — No extra dependency weight

## Why Separate Steps Collection?

- **Step reuse** — Multiple sequences can reference the same step document
- **`usedBy` tracking** — Denormalized array shows which sequences use a step
- **Standalone editing** — Steps can be edited independently from sequences
- **Migration from embedded** — `scripts/normalizeSequences.ts` extracted steps from inline to separate docs

## Why Empty String Stripping?

- **Firestore behavior** — Empty strings `""` are stored differently from missing fields
- **Android compatibility** — Android app treats missing fields as `""`
- **Clean data** — Prevents unnecessary storage of empty values
- **`deleteField()`** for description — Special handling to actually remove the field

## Why `window.confirm()` for Deletions?

- **Simplicity** — No modal component needed
- **Sufficient for personal use** — This is a single-user app
- **Consistent UX** — Browser-native confirmation dialog
- **Future improvement** — Could be replaced with custom modal

## Why No Optimistic Updates?

- **Simplicity** — Query invalidation is straightforward
- **Firestore latency** — Writes are fast enough that optimistic updates aren't critical
- **Consistency** — Server state is always the source of truth
- **Reduced bugs** — No need to rollback on failure
