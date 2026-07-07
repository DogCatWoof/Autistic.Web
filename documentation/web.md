# Web Interface Requirements

Companion web view for the My Android app. Data lives in Firestore and is
read/written through the same collections the Android app syncs with. Auth via
Firebase (same account as the app).

---

## Tech Stack

### Core
- **React + TypeScript** — client-side SPA (no SSR needed; everything behind Firebase Auth)
- **Firebase JS SDK v9** (modular) — Firestore + Auth; same collections as the Android app
- **Tailwind CSS + shadcn/ui** — table, collapsible, dialog, form components
- **Firebase Hosting** — deploy target; free tier sufficient for personal use

### Supporting libraries
- **React Router v7** — client-side routing for the 7 sections
- **TanStack Query** — caching and loading states for Firestore reads (or `onSnapshot` listeners directly)
- **date-fns** — timestamp formatting (`loggedAt`, `dueAt`, `createdAt`, `completedAt`, etc.)
- **Recharts** — mood summary chart (section 3.2)
- **dnd-kit** — drag-to-reorder sequence steps (section 5.3)
- **react-hook-form + zod** — food log and sequence forms

### Tooling
- **ESLint + Prettier** — linting and formatting
- **Testing Library** — unit and component tests
- **vite-plugin-pwa** — installable PWA (natural fit as a mobile companion)

---

# Until I say otherwise, the following are out of scope.  Except for navigation.  That should always be included:
* Tasks
* Task templates
* Mood
* Vitals / Health
* Notes
* Food log
* Scanned Products
* Food Cache

## Access levels

| Section              | Web access  |
|----------------------|-------------|
| Tasks (today's list) | Read-only   |
| Daily task templates | Read-only   |
| Mood history         | Read-only   |
| Vitals / Health      | Read-only   |
| Notes                | Read / write |
| Food log             | Read / write |
| Sequences            | Read / write |
| Scanned products     | Read-only   |
| Food cache           | Read-only   |

---

## 1. Tasks

### 1.1 Today's task list (read-only)

Display all tasks with `completedAt IS NULL` for today.

**Fields shown per task:**
- Title (`task`)
- Category (`category`)
- Due time — formatted as clock time if `dueAt` is set, otherwise "all day"
- Expected duration (`expectedTimeMinutes`) — shown as e.g. "30 min" if set
- Important flag (`isImportant`) — visual indicator (e.g. amber star)
- Notes (`notes`) — shown collapsed/expandable
- Origin — badge "Daily" when `dailyTaskId IS NOT NULL`, otherwise none

**Grouping / ordering:**
- Group by category, alphabetical category order
- Within a group: important tasks first, then by `dueAt` ascending, then undated

**Completed tasks:**
- Separate collapsible section showing tasks completed today (`completedAt` is today's date)

### 1.2 Daily task templates (read/write)

List all rows from `daily_tasks`, sorted alphabetically by title.

**Fields shown:**
- Title
- Category
- Scheduled time (`timeMinutes`) — displayed as clock time (e.g. "8:30 AM"), or "any time" if null
- Expected duration (`expectedTimeMinutes`)
- Required (`isRequired`) — visual badge

---

## 2. Notes (read/write)

### 2.1 Note list

Display all notes where `isDeleted = false`, ordered by `updatedAt` descending.

**Fields shown per row:**
- Display title — `title` if non-blank, otherwise first non-blank line of `content`, otherwise "(empty)"
- Last updated timestamp

**Filtering / search:** free-text search across title and content.

### 2.2 Note detail / editor

Clicking a note opens it for reading. Switching to edit mode allows:
- Edit `title`
- Edit `content` (multi-line plain text; preserve line breaks)
- Save — updates `updatedAt` to now, sets `pendingFirestoreSync = true`
- Delete — soft-delete: sets `isDeleted = true`, `updatedAt = now`

### 2.3 Create note

- Button to create a new note
- Fields: optional title, body content
- On save: `createdAt = updatedAt = now`, `pendingFirestoreSync = true`

---

## 3. Mood (read-only)

### 3.1 Mood history list

All rows from `moods` where `isDeleted = false`, ordered by `createdAt` descending.

**Fields shown per row:**
- Emoji and label (one of 14 options — Happy 😊, Sad 😢, Angry 😠, Calm 😌, Tired 😴, Bored 😑, Lonely 🥺, Playful 😜, Content 😇, Loved 🥰, Sick 🤒, Stressed 😓, Anxious 😰, Overwhelmed 🤯)
- Activity / note text (`activity`, `notes`) — shown if non-empty
- Timestamp (`createdAt`)

### 3.2 Mood summary (optional panel)

- Count per emoji for the past 7 days and 30 days
- Timeline chart showing entries per day (bar or dot chart)

---

## 4. Vitals (read-only)

Combines daily health snapshots from Health Connect with daily food-log totals.
Displayed as a reverse-chronological list (most recent date first).

### 4.1 Health snapshot per day

Source: `health_snapshots` table, keyed by date (`yyyy-MM-dd`).

**Fields shown:**
- Steps (`steps`) — with a step-count icon
- Sleep (`sleepMinutes`) — displayed as hours and minutes (e.g. "7h 23m")
- Avg heart rate (`avgHeartRateBpm`) — in bpm
- Weight (`weightKg`) — in kg
- Calories burned (`caloriesBurned`) — in kcal
- Blood glucose (`bloodGlucoseMmol`) — in mmol/L

Any null field is hidden rather than shown as zero.

### 4.2 Food log totals per day

Source: derived from `food_log_items` grouped by `date`.

**Macro totals shown:**
- Calories (kcal)
- Protein (g)
- Total fat (g)
- Net carbs (g) — `totalCarbs − fiber − sugarAlcohols`, floored at 0
- Fiber (g)
- Total sugars (g)
- Added sugars (g)
- Sugar alcohols (g)

### 4.3 Food log items per day (expandable)

Expand a day to see individual `food_log_items` rows, ordered by `loggedAt` ascending.

**Fields per item:**
- Description (`description`)
- Logged time (`loggedAt`)
- Per-item macro values (same set as 4.2)
- AI analysis result (`aiAnalysisResult`) — shown collapsed if non-null
- Pending AI badge (`isAiPending`) — shown when AI analysis not yet returned

### 4.4 Add / edit food log item (write)

From the expanded day view:

**Create:**
- Description (text)
- Log time (defaults to now)
- Nutrition fields: calories, protein, total fat, total carbs, fiber, total sugars, added sugars, sugar alcohols
- On save: `loggedAt = now`, `lastModifiedAt = now`, `pendingFirestoreSync = true`

**Edit:**
- All fields from create, pre-filled
- On save: `lastModifiedAt = now`, `pendingFirestoreSync = true`

**Delete:**
- Soft-delete: sets `isDeleted = true`, `lastModifiedAt = now`, `pendingFirestoreSync = true`

---

## 5. Sequences (read/write)

The web app manages sequence **definitions** only — creating, editing, deleting sequences and their steps. The Android app handles execution (runs, timers, voice activation, set tracking). The web displays run history and active-run indicators as read-only data synced from Firestore.

### 5.1 Step types

Each step in a sequence has a **type** that determines its fields. All step types share `id`, `type`, `position`, `title`, `instructions`, and `media`.

#### 5.1.1 Repetition step

For exercises with sets, reps, weight, or duration (consolidated from old `exercise`/`stretch` types).

**Fields:**
- `equipment` — machine or equipment name
- `unit` — `"none"`, `"weight"`, or `"seconds"` (controls which value field is active)
- `steps` — number of sets
- `reps` — reps per set
- `weightLb` — only when `unit = "weight"`
- `durationSeconds` — only when `unit = "seconds"`
- `restBetweenSetsSeconds` — rest timer between sets
- `voiceActivation` — boolean (Android uses this for hands-free start)

#### 5.1.2 Repeat group

A container that holds sub-steps that repeat until the user marks them done. Sub-steps are sortable, individually collapsible, and editable inline.

**Fields:**
- `steps` — nested list of sub-steps (any type)

#### 5.1.3 Action step

A simple task or chore with a description and optional duration timer. Supersedes the old `timer` type.

**Fields:**
- `durationMinutes` — only when `useDuration` is enabled
- `timerEndBehavior` — `"notification"` or `"none"`, only when `useDuration` is enabled
- `useDuration` — checkbox to enable/disable the duration timer

### 5.2 Sequence list

All sequences where `isDeleted = false`, sorted alphabetically by `name`.

**Fields per row:**
- Name
- Step count
- Repeat mode badge — `🔁 until done` or `🔁 Nx` when `repeatMode !== 'once'`
- Active run indicator — badge if a `sequence_runs` record has `completedAt IS NULL` for this sequence

### 5.3 Sequence detail

Clicking a sequence shows its ordered steps with full step-type-specific fields. The sequence's repeat mode is shown as a badge next to the step count.

For repeat group steps, each sub-step renders as its own interactive card with:
- Expand/collapse toggle (click the row) to reveal `StepFieldsForm`
- Delete button (**×**) to remove the sub-step
- Changes save immediately to Firestore

### 5.4 Create / edit / delete sequence

**Create:**
- Name field
- Repeat mode dropdown — `Once (no repeat)`, `🔁 Until done`, `🔁 Fixed count` (shows count input when selected)
- Add steps inline by type (repetition / repeat group / action)
- Repeat group sub-steps added via individual type buttons (`+ ✅ Action`, `+ ⏱ Timer`, etc.) and are always visible with inline form fields
- Drag-to-reorder steps

**Edit:**
- Rename
- Change repeat mode
- Add, edit, delete, reorder steps and sub-steps
- On save: `lastModifiedAt = now`, `pendingFirestoreSync = true`

**Delete:**
- Soft-delete: `isDeleted = true`, `lastModifiedAt = now`, `pendingFirestoreSync = true`
- Cascades soft-delete to all steps

### 5.5 Run history (read-only)

Collapsible section per sequence showing past runs from `sequence_runs`.

**Fields per run:**
- Started at (`startedAt`)
- Completed at (`completedAt`) — or "In progress" if null
- Duration — `completedAt − startedAt` if both present
- Steps completed — count of `sequence_step_progress` rows for that run

---

## 6. Scanned products (read-only)

Source: `products` table (barcode scan cache from Open Food Facts / USDA).

### 6.1 Product list

All cached products, sorted alphabetically by name.

**Fields per row:**
- Barcode (EAN/UPC)
- Product name (`name`)
- Brand (`brands`)
- Serving size / quantity (`quantity`)

### 6.2 Product detail

Clicking a product shows full detail:

- All label fields: barcode, name, brands, quantity, servings per container (`servingsPerContainer`), ingredients, food group (`foodGroups`)
- Nutrition label from `nutriments` (per serving):
  - Energy (kcal)
  - Total fat, saturated fat, trans fat, polyunsaturated fat, monounsaturated fat
  - Cholesterol, sodium
  - Total carbohydrates, dietary fiber, total sugars
  - Protein
  - Vitamins & minerals: A, D, calcium, iron, potassium, magnesium, phosphorus, riboflavin, folate, B12
  - Daily value % shown alongside each value where available

---

## 7. Food cache (read-only)

Source: `food_cache` table — AI-analysed food entries accepted by the user.
Each entry stores per-serving nutrition for a named food.

### 7.1 Cache list

All rows, sorted alphabetically by `description`.

**Fields per row:**
- Food name (`description`)
- Calories
- Key macros: protein (g), total fat (g), total carbs (g), fiber (g)

### 7.2 Cache detail

Clicking an entry shows all stored nutrition values:
- Calories
- Protein (g)
- Total fat (g)
- Total carbs (g)
- Fiber (g)
- Total sugars (g)
- Added sugars (g)
- Sugar alcohols (g)
- Net carbs (g) — computed: `totalCarbs − fiber − sugarAlcohols`, floored at 0

---

## Data sync notes

- All writes set `pendingFirestoreSync = true` and update `lastModifiedAt` (or `updatedAt` for notes).
- The Android app is the sync authority for Health Connect data — the web never writes to `health_snapshots`.
- The web does not trigger barcode scans or AI photo analysis — `products` and `food_cache` are populated by the Android app only.
- Soft-deleted records (`isDeleted = true`) are never shown in the web UI.
- Food log items older than 14 days are purged by the Android app's daily reset worker; the web should reflect whatever Firestore contains.

---

Productionalization Tasks
1. Firebase Auth (Google Sign-In) — highest priority
- Create an AuthProvider context with onAuthStateChanged listener and expose user, loading, signIn, signOut
- Create a SignInPage with Google sign-in button (GoogleAuthProvider + signInWithPopup/signInWithRedirect)
- Add firebase/auth logic to src/lib/firebase.ts (already imports getAuth)
- Protect routes: wrap the app in AuthProvider, redirect unauthenticated users to sign-in
- Add sign-out to the sidebar
- (Google Cloud) Enable Google Sign-In in Firebase Auth console, configure OAuth consent screen, add authorized domains
2. Firestore Security Rules & Indexes
- Write Firestore security rules (lock down by request.auth.uid, allow read/write only to authenticated users)
- Create composite indexes for queries the app runs:
- sequences where isDeleted == false order by name
- sequence_runs where sequenceId == X order by startedAt desc
- sequence_runs where completedAt == null
- (repeat for Notes, Mood, etc. when implemented)
3. Repository: Mock → Real Data
- Verify sequences and sequence_runs collection schemas match the Android app's output (field names, types)
- Test that fetchSequences, fetchSequenceById, createSequence, updateSequence, deleteSequence work against real Firestore after removing USE_MOCK
- Same for fetchAllRuns, fetchRunsForSequence, fetchActiveRuns
- Add proper error handling in all repository functions (retry logic, user-facing error messages)
4. Environment & Build Config
- Create .env.example documenting all 6 FIREBASE_* vars
- Add separate .env.production if needed for prod Firebase project
- Verify PWA icons exist at public/pwa-192x192.png and public/pwa-512x512.png (currently referenced in manifest but may be missing)
5. Testing Infrastructure
- Create src/test/setup.ts with import '@testing-library/jest-dom' (referenced in vitest config, doesn't exist)
- Write test for SequenceListView renders sequences
- Write test for drag-to-reorder logic
- Write test for useUpdateSequence mutation
- Wire up CI (GitHub Actions) to run npm run test:run on push
6. Code Quality Fixes
- StepCard.tsx — lint error: React is not defined (needs import React or remove JSX React namespace usage)
- useGooglePicker.ts — lint warnings: replace any types with proper types
- Run npm run lint:fix and npm run format across the codebase
7. Complete Stub Pages (per web.md)
- Notes (read/write) — list, detail/editor, create, soft-delete
- Mood (read-only) — history list, optional summary chart via Recharts
- Vitals (read-only) — health snapshots + food log totals per day
- ScannedProducts (read-only) — product list + detail with nutrition label
- FoodCache (read-only) — cache list + detail
- Tasks (read-only) — today's list grouped by category, completed tasks section
8. Deployment
- Initialize Firebase Hosting (firebase init hosting)
- Add deploy script: npm run build && firebase deploy
- Set up preview channels for PRs
- Configure custom domain (if desired)
9. PWA Polish
- Generate proper PWA icons (192×192, 512×512)
- Add public/favicon.svg if missing
- Test service worker registration and offline fallback
- Test display: standalone behavior on mobile
10. Post-Launch Verification
- End-to-end walkthrough: sign in → view sequences → create → edit → reorder → delete → view run history
- Verify all pendingFirestoreSync: true writes are consumed by the Android app
