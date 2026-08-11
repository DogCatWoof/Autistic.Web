# Architecture

## High-Level Overview

Autistic.web is a **React 19 + TypeScript 6 PWA** that serves as a companion web view for an Android app. It shares data through **Firebase Firestore** and **Firebase Auth** (Google Sign-In). The web app manages sequence and step definitions (CRUD), while the Android app handles execution (timers, voice activation, Health Connect sync).

```
┌─────────────────────────────────────────────────────┐
│                    Browser (PWA)                     │
│                                                     │
│  main.tsx                                           │
│    └─ QueryClientProvider (TanStack Query)          │
│       └─ BrowserRouter (React Router v7)            │
│          └─ AuthProvider (Firebase Auth context)     │
│             └─ App.tsx                              │
│                ├─ Sidebar (desktop)                 │
│                ├─ BottomTabBar (mobile)             │
│                └─ <Routes>                          │
│                     ├─ /sequences → Sequences.tsx   │
│                     ├─ /steps → Steps.tsx           │
│                     ├─ /tasks → Tasks.tsx            │
│                     ├─ /notes → Notes.tsx (stub)    │
│                     ├─ /mood → Mood.tsx (stub)      │
│                     ├─ /vitals → Vitals.tsx (stub)  │
│                     ├─ /products → ScannedProducts  │
│                     └─ /food-cache → FoodCache      │
│                                                     │
│  ┌─ Hooks Layer (React Query wrappers) ────────────┐ │
│  │ useSequences.ts, useSteps.ts, useAuth.tsx       │ │
│  └─────────────────────────────────────────────────┘ │
│                         │                           │
│  ┌─ Repository Layer ──────────────────────────────┐ │
│  │ sequenceRepository.ts, stepRepository.ts,       │ │
│  │ taskRepository.ts                               │ │
│  └─────────────────────────────────────────────────┘ │
│                         │                           │
│  ┌─ Firebase Layer ────────────────────────────────┐ │
│  │ lib/firebase.ts (app, auth, db, googleProvider) │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                  Firebase Backend                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Firestore │  │   Auth   │  │   Hosting (PWA)  │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Module / Package Breakdown

| Module | Path | Responsibility |
|--------|------|----------------|
| Entry | `src/main.tsx` | Bootstrap React, configure QueryClient, render App |
| App Shell | `src/App.tsx` | Auth gate, layout shell (Sidebar + BottomTabBar), route definitions |
| Pages | `src/pages/*.tsx` | Screen-level components, one per route |
| Components | `src/components/*.tsx` | Reusable UI components (SequenceEditor, StepCard, StepFieldsForm, etc.) |
| Hooks | `src/hooks/*.ts(x)` | React Query wrappers and custom hooks (useSequences, useSteps, useAuth, useUnsavedChanges) |
| Repositories | `src/repositories/*.ts` | Firestore query functions (read/write). No business logic. |
| Types | `src/types/*.ts` | TypeScript interfaces and factory functions (Step, Sequence, Task) |
| Lib | `src/lib/*.ts` | Firebase initialization, Google Picker integration |
| Styles | `src/styles/globals.css` | CSS custom properties and Tailwind import |
| Scripts | `scripts/*.ts` | One-time Firestore migration scripts (firebase-admin) |
| Documentation | `docs/*.md` | Requirements, specs, mockups |

## Dependency Injection / Wiring

The app uses a **provider tree** pattern for dependency injection:

1. **QueryClientProvider** — configures TanStack Query (5min staleTime, no refetchOnWindowFocus)
2. **BrowserRouter** — React Router v7
3. **AuthProvider** — custom context wrapping `useAuth` (exposes `user`, `loading`, `signIn`, `signOut`)
4. **Firebase singletons** — `auth`, `db`, `app`, `googleProvider` exported from `lib/firebase.ts` as module-level `let` values

No formal DI container. Modules import Firebase singletons directly from `lib/firebase.ts`.

## Data Flow

```
User Action
  → Page Component
    → React Query Hook (useMutation / useQuery)
      → Repository Function (fetchSequences, createStep, etc.)
        → Firebase Firestore SDK (withTimeout wrapper)
          → Firestore Cloud
```

- **Reads**: React Query hooks call repository functions → data cached with 5min staleTime
- **Writes**: Mutations call repository functions → `onSuccess` invalidates relevant query keys
- **Auth**: `useAuth()` hook provides user state; unauthenticated users see SignIn page

## External Service Integrations

| Service | Purpose | Module |
|---------|---------|--------|
| Firebase Auth | Google Sign-In | `lib/firebase.ts`, `hooks/useAuth.tsx` |
| Firebase Firestore | Data persistence (sequences, steps, tasks, runs) | `repositories/*.ts` |
| Google Picker API | Browse Google Drive Photos / Google Photos | `lib/useGooglePicker.ts` |
| Firebase Hosting | PWA deployment (planned) | `vite.config.ts` PWA config |

## Build System

| Tool | Version | Purpose |
|------|---------|---------|
| Vite | 8.x | Dev server + production build |
| TypeScript | 6.x | Type checking (`noEmit: true`, `strict: true`) |
| Tailwind CSS | 4.x | Utility-first styling (via `@tailwindcss/vite` plugin) |
| ESLint | 9.x | Linting (flat config in `eslint.config.js`) |
| Prettier | 3.x | Code formatting |
| Vitest | 4.x | Unit testing (jsdom environment) |
| vite-plugin-pwa | 1.3.x | PWA manifest + service worker |

**Build command**: `tsc && vite build`

**Environment variables**: All Firebase config uses `FIREBASE_*` prefix (configured via `envPrefix` in `vite.config.ts`). Variables are accessed via `import.meta.env.FIREBASE_*`.

## File Structure

```
src/
├── main.tsx                    # Entry point
├── App.tsx                     # App shell with routing
├── counter.ts                  # Orphaned boilerplate (DO NOT USE)
├── assets/                     # Static assets
├── components/
│   ├── navConfig.ts            # Navigation items definition
│   ├── Sidebar.tsx             # Desktop sidebar navigation
│   ├── BottomTabBar.tsx        # Mobile bottom tab bar
│   ├── SequenceEditor.tsx      # Full sequence editor (486 lines)
│   ├── StepCard.tsx            # Standalone step card display
│   ├── StepTypePicker.tsx      # Modal for selecting step type
│   ├── stepFields.tsx          # Step field definitions, display, and form components
│   ├── StepIcons.tsx           # SVG icons for step types
│   └── FileDropInput.tsx       # Image upload with drag-drop, Google Drive/Photos picker
├── hooks/
│   ├── useAuth.tsx             # Auth context provider + hook
│   ├── useSequences.ts         # React Query hooks for sequences and runs
│   ├── useSteps.ts             # React Query hooks for steps
│   └── useUnsavedChanges.ts    # beforeunload guard for dirty state
├── lib/
│   ├── firebase.ts             # Firebase app/auth/firestore initialization
│   └── useGooglePicker.ts      # Google Picker API integration
├── pages/
│   ├── SignIn.tsx              # Google sign-in page
│   ├── Sequences.tsx           # Sequence list + editor views
│   ├── Steps.tsx               # Step list + editor views
│   ├── Tasks.tsx               # Today's tasks (read-only, functional)
│   ├── Notes.tsx               # Stub
│   ├── Mood.tsx                # Stub
│   ├── Vitals.tsx              # Stub
│   ├── ScannedProducts.tsx     # Stub
│   └── FoodCache.tsx           # Stub
├── repositories/
│   ├── sequenceRepository.ts   # Firestore CRUD for sequences + runs
│   ├── stepRepository.ts       # Firestore CRUD for steps
│   └── taskRepository.ts       # Firestore queries for tasks
├── styles/
│   └── globals.css             # CSS variables + Tailwind import
├── test/                       # Empty — setup.ts not yet created
└── types/
    ├── step.ts                 # Step interface + createStepDoc factory
    ├── sequence.ts             # Sequence, SequenceRun, StepRecord, SetRecord
    └── task.ts                 # Task interface
```

## Key Design Patterns

1. **Repository Pattern** — All Firestore queries are in `repositories/`. Pages never import Firebase SDK directly.
2. **React Query as Cache Layer** — All server state managed through TanStack Query. No global client-side state store.
3. **Soft Delete** — `isDeleted` flag on sequences and steps. Queries always filter `where('isDeleted', '==', false)`.
4. **Empty String Stripping** — `sequenceRepository.ts` strips empty strings before Firestore writes (Firestore dislikes empty strings).
5. **Timeout Wrapper** — All Firestore calls wrapped in `withTimeout` (10s) to prevent hanging requests.
6. **Nullable Firebase** — `lib/firebase.ts` exports nullable singletons (`db`, `auth`). All repositories guard with `if (!db) return` for graceful degradation when env vars are missing.
7. **PWA with Service Worker Unregistered** — `main.tsx` actively unregisters service workers (likely for development). PWA manifest configured for production.

## Migration History

Three migration scripts exist in `scripts/`:

1. **`migrateFirestore.ts`** — Migrates old step types (`exercise`, `stretch`, `timer`) to unified types (`repetition`, `action`). Removes deprecated `repeatMode`/`repeatCount` from sequences.
2. **`migrateStepsToCollection.ts`** — Extracts embedded steps from sequence documents into standalone `steps` collection documents.
3. **`normalizeSequences.ts`** — Combines both: normalizes step types AND replaces embedded steps with `StepReference[]` (stepId + position). Idempotent.

---

## Missing Information (Human Input Required)

1. **Deployment target** — Is Firebase Hosting the intended deployment platform? Is there a `firebase.json` configured?
2. **Firebase project ownership** — The Android app is the primary data producer. What is the deployment relationship between the two apps?
3. **Firestore security rules** — What security rules are in place? Are they documented anywhere?
4. **Offline support strategy** — The service worker is actively unregistered. Is offline support planned, or is this purely online?
5. **PWA icons** — `public/pwa-192x192.png` and `public/pwa-512x512.png` are referenced in the manifest but may not exist.
6. **CI/CD pipeline** — Is there a GitHub Actions workflow or other CI setup?
7. **Custom domain** — Is a custom domain planned for Firebase Hosting?
8. **Testing strategy** — The `src/test/` directory is empty. What is the testing priority? Which features need tests first?
9. **Notes, Mood, Vitals pages** — These are stubs. What is the implementation priority and timeline?
10. **Food log editing** — `web.md` specifies read/write access for food log items, but no corresponding page or Firestore queries exist yet.
11. **`daily_tasks` collection** — Referenced in `web.md` section 1.2 but no repository or type exists.
12. **Health Connect data** — `health_snapshots` and `food_log_items` collections are described in `web.md` but no types or queries exist.
13. **Recharts integration** — `recharts` is a dependency but not imported anywhere. Intended for mood summary chart.
14. **react-hook-form + zod** — Both are dependencies but not used in any component yet. Likely intended for future form-heavy pages.
15. **Error boundaries** — No React error boundary components exist. How should fatal errors be displayed?
