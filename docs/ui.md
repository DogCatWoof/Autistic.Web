# UI

## Screens / Pages

| Route | Component | Status | Access |
|-------|-----------|--------|--------|
| `/` | Redirect → `/sequences` | ✅ | Auth required |
| `/sequences` | `Sequences.tsx` | ✅ Full CRUD | Read/Write |
| `/steps` | `Steps.tsx` | ✅ Full CRUD | Read/Write |
| `/tasks` | `Tasks.tsx` | ✅ Read-only list | Read-only |
| `/notes` | `Notes.tsx` | 🔲 Stub | Read/Write (planned) |
| `/mood` | `Mood.tsx` | 🔲 Stub | Read-only (planned) |
| `/vitals` | `Vitals.tsx` | 🔲 Stub | Read-only (planned) |
| `/products` | `ScannedProducts.tsx` | 🔲 Stub | Read-only (planned) |
| `/food-cache` | `FoodCache.tsx` | 🔲 Stub | Read-only (planned) |
| *(sign-in)* | `SignIn.tsx` | ✅ | Unauthenticated |

### SignIn (`src/pages/SignIn.tsx`)
Full-screen centered card with Google Sign-In button. Shows app logo and note about shared account with Android app.

### Sequences (`src/pages/Sequences.tsx`)
Two internal views managed by local `useState`:
- **List view**: All sequences with step count, active-run badge. "New" button creates a blank sequence and opens editor. "Steps" button navigates to `/steps`. Collapsible run history section at bottom.
- **Editor view** (`SequenceEditor.tsx`): Full sequence editor with name, description, ordered step list, drag-to-reorder (`@dnd-kit`), add/create steps, inline editing. Save/Delete buttons.

### Steps (`src/pages/Steps.tsx`)
Two internal views:
- **List view**: All steps with type icon, title, summary (e.g. "3×10 @ 50 lb"). "New" button opens StepTypePicker modal.
- **Edit view**: Full step editor with type-specific form fields, child steps (for `repeat_group`), "Used by" section showing which sequences reference this step.

### Tasks (`src/pages/Tasks.tsx`)
Read-only list of incomplete tasks grouped by category. Each row shows title, due time, duration, important flag, "Daily" badge, expandable notes. Simple functional component with no write capability.

### Stubs (`Notes`, `Mood`, `Vitals`, `ScannedProducts`, `FoodCache`)
Minimal placeholder with heading and "coming soon" text.

## Navigation

### Layout System
- **Desktop** (≥`md` breakpoint): Fixed `Sidebar` (width `w-56` / 14rem) on left. Main content offset with `md:ml-56`.
- **Mobile** (<`md`): Fixed `BottomTabBar` at bottom. Main content has `pb-16` for bottom padding.

Both navigation components are always rendered in the DOM; CSS visibility controls which is shown (`Sidebar`: `hidden md:flex`, `BottomTabBar`: `md:hidden`).

### Navigation Items (`src/components/navConfig.ts`)

| Path | Label | Icon |
|------|-------|------|
| `/tasks` | Tasks | ✅ |
| `/notes` | Notes | 📝 |
| `/mood` | Mood | 😊 |
| `/vitals` | Vitals | ❤️ |
| `/sequences` | Sequences | 🔄 |
| `/products` | Products | 🛒 |
| `/food-cache` | Food | 🍎 |

### Routing (`src/App.tsx`)
```
<BrowserRouter>
  <Routes>
    <Route path="/" element={<Navigate to="/sequences" replace />} />
    <Route path="/tasks" element={<Tasks />} />
    <Route path="/notes" element={<Notes />} />
    <Route path="/mood" element={<Mood />} />
    <Route path="/vitals" element={<Vitals />} />
    <Route path="/sequences" element={<Sequences />} />
    <Route path="/steps" element={<Steps />} />
    <Route path="/products" element={<ScannedProducts />} />
    <Route path="/food-cache" element={<FoodCache />} />
  </Routes>
</BrowserRouter>
```

No nested routes. No deep linking. No route parameters (IDs are managed via local state within page components).

## State Management

### Server State: TanStack Query
All server state managed through `@tanstack/react-query` v5.

**Global Config** (`src/main.tsx`):
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});
```

**Query Keys**:
| Key | Hook | Description |
|-----|------|-------------|
| `['steps']` | `useSteps()` | All non-deleted steps |
| `['step', id]` | `useStep(id)` | Single step by ID |
| `['steps', 'byIds', ids]` | `useStepsByIds(ids)` | Multiple steps by ID array |
| `['sequences']` | `useSequences()` | All non-deleted sequences |
| `['sequence', id]` | `useSequence(id)` | Single sequence by ID |
| `['activeRuns']` | `useActiveRuns()` | In-progress sequence runs |
| `['allRuns']` | `useAllRuns()` | All sequence runs (descending) |
| `['sequenceRuns', id]` | `useSequenceRuns(id)` | Runs for a specific sequence |
| `['tasks', 'incomplete']` | Direct `useQuery` in Tasks.tsx | Incomplete tasks |

**Mutation Pattern**:
```typescript
// Example from useSequences.ts
export function useCreateSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => createSequence(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sequences'] }); },
  });
}
```

All mutations invalidate related query keys on success. No optimistic updates. No error callbacks in hooks (errors bubble to component level).

### Client State: Local `useState`
- Page-level view toggling (list vs. edit) via `useState<'list' | 'edit'>`
- Form state in editors (name, description, stepRefs, editStep) via `useState`
- Expanded/collapsed UI state via `useState`
- Dirty tracking via `useRef` + comparison (SequenceEditor)

### Auth State: React Context
`AuthProvider` wraps the app and exposes:
```typescript
interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}
```
Uses `onAuthStateChanged` listener. `loading` is `true` until first auth state resolves.

### No Global State Store
No Redux, Zustand, Jotai, or other client state library. All app state is local to components or managed by React Query.

## Reusable Components

| Component | Path | Purpose |
|-----------|------|---------|
| `SequenceEditor` | `src/components/SequenceEditor.tsx` | Full sequence editor with DnD, step picker, inline create |
| `StepCard` | `src/components/StepCard.tsx` | Display a step with type icon, fields, expand/collapse |
| `StepTypePicker` | `src/components/StepTypePicker.tsx` | Modal for choosing step type (repetition/repeat_group/action) |
| `StepFieldsDisplay` | `src/components/stepFields.tsx` | Read-only display of step fields |
| `StepFieldsForm` | `src/components/stepFields.tsx` | Editable form for step fields |
| `StepIcon` | `src/components/StepIcons.tsx` | SVG icons for step types (color-coded) |
| `FileDropInput` | `src/components/FileDropInput.tsx` | Image upload with drag-drop, file picker, Google Drive/Photos, URL paste, reorderable thumbnails |
| `Sidebar` | `src/components/Sidebar.tsx` | Desktop navigation sidebar |
| `BottomTabBar` | `src/components/BottomTabBar.tsx` | Mobile bottom navigation |
| `AuthProvider` | `src/hooks/useAuth.tsx` | Firebase Auth context provider |

## Step Fields System (`src/components/stepFields.tsx`)

A declarative field definition system for step types:

```typescript
interface StepFieldDef {
  key: string;
  label: string | ((step: Step) => string);
  type: 'text' | 'number' | 'select' | 'toggle' | 'media' | 'textarea';
  primary?: boolean;        // Displayed prominently in read-only view
  options?: { label: string; value: string }[];
  showIf?: (step: Step) => boolean;  // Conditional visibility
  width?: string;           // Tailwind width class
}
```

Fields are defined per step type in `fieldsMap`. `StepFieldsDisplay` renders read-only summary. `StepFieldsForm` renders editable inputs with inline grouping for compact fields (numbers, selects).

## Theme / Design System

### CSS Custom Properties (`src/styles/globals.css`)
```css
:root {
  --background: #ffffff;
  --foreground: #171717;
  --primary: #3b82f6;
  --primary-foreground: #ffffff;
  --secondary: #f3f4f6;
  --secondary-foreground: #1f2937;
  --muted: #f3f4f6;
  --muted-foreground: #6b7280;
  --accent: #f3f4f6;
  --accent-foreground: #1f2937;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: #e5e7eb;
  --input: #e5e7eb;
  --ring: #3b82f6;
  --radius: 0.5rem;
}
```

### Styling Approach
- **Tailwind CSS v4** utility classes used exclusively in JSX
- No component library (no shadcn/ui components despite `web.md` mentioning it)
- System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif`
- Color scheme: gray backgrounds (`bg-gray-50`, `bg-white`), blue accents (`blue-500`), semantic colors for status

### Step Type Colors (`src/components/StepIcons.tsx`)
| Type | Color |
|------|-------|
| `repetition` | `#4A90E2` (blue) |
| `repeat_group` | `#a855f7` (purple) |
| `action` | `#6b7280` (gray) |

## UI Testing Approach

- **Vitest** configured with `jsdom` environment and `@testing-library/react`
- `src/test/setup.ts` referenced but **does not exist yet** — must be created before tests can run
- No tests currently exist
- No test files found matching `*.test.ts` or `*.spec.ts` patterns
