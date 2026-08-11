# Project Glossary

## Domain Terms

| Term | Definition |
|------|------------|
| **Sequence** | An ordered list of steps representing a routine, workout, or task list |
| **Step** | A single unit of work within a sequence (repetition, repeat_group, or action) |
| **Run** (`SequenceRun`) | A record of executing a sequence, created by the Android app |
| **Step Record** | Per-step progress data within a run (sets completed, weights, reps) |
| **Set Record** | Individual set data within a step record (set number, weight, reps, duration) |
| **Repeat Group** | A step type that contains sub-steps executed repeatedly until marked done |
| **Soft Delete** | Setting `isDeleted = true` instead of removing the document |
| **Pending Sync** | `pendingFirestoreSync = true` flag indicating the Android app should process this change |

## Step Types

| Type | Icon | Color | Purpose |
|------|------|-------|---------|
| `repetition` | Numbered circle | Blue (`#4A90E2`) | Exercise with sets, reps, weight or duration |
| `repeat_group` | Circular arrows | Purple (`#a855f7`) | Container for repeating sub-steps |
| `action` | Clipboard | Gray (`#6b7280`) | Simple task or chore, optional timer |

## Abbreviations

| Abbreviation | Meaning |
|--------------|---------|
| `DnD` | Drag and Drop (`@dnd-kit` library) |
| `PWA` | Progressive Web App |
| `SW` | Service Worker |
| `FK` | Foreign Key (Firestore document reference) |
| `gcTime` | Garbage Collection Time (React Query cache retention) |
| `staleTime` | Time before cached data is considered stale (React Query) |
| `SUT` | System Under Test |
| `EAN/UPC` | European Article Number / Universal Product Code (barcodes) |

## Key Classes / Components

| Component | File | Purpose |
|-----------|------|---------|
| `AppShell` | `src/App.tsx` | Auth gate + layout shell with routing |
| `SequenceEditor` | `src/components/SequenceEditor.tsx` | Full sequence editor with DnD, step management |
| `StepFieldsForm` | `src/components/stepFields.tsx` | Declarative form generator for step types |
| `StepFieldsDisplay` | `src/components/stepFields.tsx` | Read-only step field renderer |
| `FileDropInput` | `src/components/FileDropInput.tsx` | Multi-source image upload with reorder |
| `AuthProvider` | `src/hooks/useAuth.tsx` | Firebase Auth context provider |
| `useGooglePicker` | `src/lib/useGooglePicker.ts` | Google Drive/Photos picker hook |

## Firebase Collections

| Collection | Purpose | Writer |
|------------|---------|--------|
| `sequences` | Sequence definitions | Web + Android |
| `steps` | Standalone step documents | Web + Android |
| `tasks` | Daily task items | Android only |
| `sequence_runs` | Execution records | Android only |
| `notes` | User notes (planned) | Web + Android |
| `moods` | Mood entries (planned) | Android only |
| `health_snapshots` | Daily health data (planned) | Android only |
| `food_log_items` | Food log entries (planned) | Web + Android |
| `products` | Scanned product cache (planned) | Android only |
| `food_cache` | AI-analysed food entries (planned) | Android only |

## Configuration Keys

| Key | Location | Purpose |
|-----|----------|---------|
| `FIREBASE_API_KEY` | `.env` | Firebase Web API key |
| `FIREBASE_AUTH_DOMAIN` | `.env` | Firebase Auth domain |
| `FIREBASE_PROJECT_ID` | `.env` | Firebase project ID |
| `FIREBASE_STORAGE_BUCKET` | `.env` | Firebase Storage bucket |
| `FIREBASE_MESSAGING_SENDER_ID` | `.env` | FCM sender ID |
| `FIREBASE_APP_ID` | `.env` | Firebase app ID |
| `FIREBASE_GOOGLE_CLIENT_ID` | `.env` | Google OAuth client ID |
| `envPrefix` | `vite.config.ts` | Vite env var prefix (`FIREBASE_`) |
| `staleTime` | `src/main.tsx` | React Query cache duration (5 min) |

## React Query Key Patterns

| Key Pattern | Data |
|-------------|------|
| `['steps']` | All non-deleted steps |
| `['step', id]` | Single step |
| `['steps', 'byIds', ids]` | Multiple steps by ID array |
| `['sequences']` | All non-deleted sequences |
| `['sequence', id]` | Single sequence |
| `['activeRuns']` | In-progress runs |
| `['allRuns']` | All runs |
| `['sequenceRuns', id]` | Runs for a sequence |
| `['tasks', 'incomplete']` | Incomplete tasks |
