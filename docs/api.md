# API

## Firebase Services

| Service | SDK | Purpose |
|---------|-----|---------|
| Firebase Auth | `firebase/auth` | Google Sign-In authentication |
| Firebase Firestore | `firebase/firestore` | Primary data store |
| Google Picker API | External script | Browse Google Drive Photos / Google Photos |

## Firebase Initialization (`src/lib/firebase.ts`)

Firebase is initialized conditionally — if `FIREBASE_API_KEY` and `FIREBASE_PROJECT_ID` are present, the app initializes. Otherwise, all service references (`auth`, `db`, `googleProvider`) are `null` and the app degrades gracefully.

```typescript
export let app: ReturnType<typeof initializeApp> | null = null;
export let auth: ReturnType<typeof getAuth> | null = null;
export let db: ReturnType<typeof getFirestore> | null = null;
export let googleProvider: GoogleAuthProvider | null = null;
```

All repository functions guard with `if (!db) return` / `if (!db) return []`.

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `FIREBASE_API_KEY` | yes | Firebase Web API key |
| `FIREBASE_AUTH_DOMAIN` | yes | Firebase Auth domain |
| `FIREBASE_PROJECT_ID` | yes | Firebase project ID |
| `FIREBASE_STORAGE_BUCKET` | yes | Firebase Storage bucket |
| `FIREBASE_MESSAGING_SENDER_ID` | yes | Firebase Cloud Messaging sender ID |
| `FIREBASE_APP_ID` | yes | Firebase app ID |
| `FIREBASE_GOOGLE_CLIENT_ID` | yes | Google OAuth client ID (for Picker API) |

All accessed via `import.meta.env.FIREBASE_*` (Vite env prefix configured in `vite.config.ts`).

## Authentication

### Provider
Firebase Auth with `GoogleAuthProvider`. Configured with `prompt: 'select_account'` to allow account switching.

### Flow
1. `AuthProvider` listens to `onAuthStateChanged`
2. While loading, shows "Loading..." screen
3. If no user → renders `SignInPage` (Google sign-in button)
4. If user → renders app shell with navigation

### Methods
- `signInWithPopup(auth, googleProvider)` — Opens Google sign-in popup
- `firebaseSignOut(auth)` — Signs out current user

## Firestore API Layer

All API calls are in `src/repositories/`. Each function wraps the Firebase SDK with a 10-second timeout.

### Sequences

| Function | Method | Firestore Operation | Return |
|----------|--------|---------------------|--------|
| `fetchSequences()` | Read | `getDocs(query(...))` | `Sequence[]` |
| `fetchSequenceById(id)` | Read | `getDoc(doc(...))` | `Sequence \| null` |
| `createSequence(data)` | Write | `addDoc(col, data)` | `string \| null` (doc ID) |
| `updateSequence(id, data)` | Write | `updateDoc(ref, data)` | `void` |
| `deleteSequence(id)` | Write | `updateDoc(ref, { isDeleted: true })` | `void` |

### Sequence Runs

| Function | Method | Firestore Operation | Return |
|----------|--------|---------------------|--------|
| `fetchActiveRuns()` | Read | `getDocs(query(...))` | `SequenceRun[]` |
| `fetchAllRuns()` | Read | `getDocs(query(...))` | `SequenceRun[]` |
| `fetchRunsForSequence(id)` | Read | `getDocs(query(...))` | `SequenceRun[]` |

### Steps

| Function | Method | Firestore Operation | Return |
|----------|--------|---------------------|--------|
| `fetchSteps()` | Read | `getDocs(query(...))` | `Step[]` |
| `fetchStepById(id)` | Read | `getDoc(doc(...))` | `Step \| null` |
| `fetchStepsByIds(ids)` | Read | `getDocs(query(...))` | `Step[]` |
| `createStep(data)` | Write | `addDoc(col, data)` | `string \| null` (doc ID) |
| `updateStep(id, data)` | Write | `updateDoc(ref, data)` | `void` |
| `deleteStep(id)` | Write | `updateDoc(ref, { isDeleted: true })` | `void` |

### Tasks

| Function | Method | Firestore Operation | Return |
|----------|--------|---------------------|--------|
| `fetchIncompleteTasks()` | Read | `getDocs(query(...))` | `Task[]` |
| `fetchCompletedToday()` | Read | `getDocs(query(...))` | `Task[]` |

## Error Handling

### Timeout Pattern
All Firestore calls use `withTimeout(promise, 10_000)` which races the actual call against a 10-second timer. On timeout, the error is logged with `console.warn('[Firestore]', ...)` and re-thrown.

### Null Guards
Every repository function checks `if (!db) return` before any Firestore operation. This prevents crashes when Firebase is not configured.

### React Query Error Handling
- `useSteps()` and `useSequences()` use `retry: false` and `gcTime: 0`
- Component-level error display: `<div className="p-4 text-red-500">Error: {String(error)}</div>`
- Loading states: `<div className="p-4 text-gray-500">Loading...</div>`

### No Global Error Boundary
There is no React error boundary. Uncaught render errors will crash the component tree.

## Google Picker API (`src/lib/useGooglePicker.ts`)

Loads Google APIs dynamically via script injection:
1. Loads `https://apis.google.com/js/api.js` (gapi)
2. Loads `https://accounts.google.com/gsi/client` (GIS)
3. Requests OAuth token with `drive.readonly` + `photoslibrary.readonly` scopes
4. Opens Google Picker for the specified view type

**Views**: `'documents'`, `'photos'`, `'drive_photos'`

Used by `FileDropInput` for browsing Google Drive Photos and Google Photos as image sources.

## Caching Strategy

| Layer | Strategy | Config |
|-------|----------|--------|
| React Query | In-memory cache | 5-minute `staleTime`, no refetch on window focus |
| Firestore SDK | Built-in offline cache | Default Firestore persistence (not explicitly configured) |
| Browser | Standard HTTP caching | PWA service worker (currently unregistered in dev) |

## Retry Strategy

- **Reads**: `retry: false` on list queries (`useSteps`, `useSequences`, `useActiveRuns`, `useAllRuns`)
- **Single reads**: Default retry (3 attempts) for `useStep(id)`, `useSequence(id)`, `useSequenceRuns(id)`
- **Mutations**: No retry configured

## No Rate Limiting

Client-side code has no rate limiting. Firestore's built-in quotas apply (50K reads/day, 20K writes/day on free tier).
