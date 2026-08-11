# Database

## Backend: Firebase Firestore

Single database: **Firestore** (native mode, `us-central1`).
Project ID: `autistic-8e840`

## Collections

> **Field definitions**: See [`FIRESTORE_SCHEMA.md`](./FIRESTORE_SCHEMA.md) for the canonical Firestore collection schemas.

### `sequences`

**Composite Index**: `isDeleted` ASC + `name` ASC
TypeScript type: `src/types/sequence.ts` → `Sequence`

### `steps`

**Composite Index**: `isDeleted` ASC + `title` ASC
TypeScript type: `src/types/step.ts` → `Step`

#### `MediaAttachment`

```typescript
{ url: string; scale: number; x?: number; y?: number }
```

#### `StepReference`

```typescript
{ stepId: string; position: number }
```

### `tasks`

**No composite index needed** — queries use single-field filters.
TypeScript type: `src/types/task.ts` → `Task`

### `sequence_runs`

**Indexes**:
- `completedAt` ASC (single-field, auto-created)
- `startedAt` DESC (single-field, auto-created)
- `sequenceId` ASC + `startedAt` DESC (composite, must be created manually)

TypeScript types: `src/types/sequence.ts` → `SequenceRun`, `StepRecord`, `SetRecord`

---

## Relationships

```
sequences ──1:N──► StepReference[] ──FK──► steps
sequences ──1:N──► sequence_runs
sequence_runs ──N:1──► sequences
steps ──repeat_group──► StepReference[] ──FK──► steps (self-referential)
steps ──usedBy──► string[] (sequence IDs)
```

- **Sequence → Steps**: Many-to-many via `StepReference[]`. A sequence references steps by ID + position. Steps can be shared across sequences.
- **Sequence → Runs**: One-to-many. Each `sequence_runs` document belongs to one sequence.
- **Step → Child Steps**: Self-referential many-to-many via `childSteps: StepReference[]` (only for `repeat_group` type).
- **Step → Used By**: Denormalized `usedBy: string[]` tracks which sequences reference a step.

## Query Patterns

| Repository Function | Collection | Query |
|---------------------|------------|-------|
| `fetchSequences()` | `sequences` | `where('isDeleted', '==', false) orderBy('name', 'asc')` |
| `fetchSequenceById(id)` | `sequences` | `doc(db, 'sequences', id)` |
| `fetchActiveRuns()` | `sequence_runs` | `where('completedAt', '==', null)` |
| `fetchAllRuns()` | `sequence_runs` | `orderBy('startedAt', 'desc')` |
| `fetchRunsForSequence(id)` | `sequence_runs` | `where('sequenceId', '==', id) orderBy('startedAt', 'desc')` |
| `fetchSteps()` | `steps` | `where('isDeleted', '==', false) orderBy('title', 'asc')` |
| `fetchStepById(id)` | `steps` | `doc(db, 'steps', id)` |
| `fetchStepsByIds(ids)` | `steps` | `where('__name__', 'in', ids)` |
| `fetchIncompleteTasks()` | `tasks` | `where('completedAt', '==', null)` |
| `fetchCompletedToday()` | `tasks` | `where('completedAt', '>=', todayStart) where('completedAt', '<=', todayEnd)` |

## Soft Delete Strategy

All mutable collections (`sequences`, `steps`) use soft delete:
- `isDeleted: boolean` field
- Writes set `isDeleted = true` and update `lastModifiedAt`
- Reads always filter `where('isDeleted', '==', false)`
- Steps use `updateDoc` to set the flag (not `deleteDoc`)
- Sequences use `updateDoc` to set the flag + `pendingFirestoreSync: true`

## Blank String Stripping

`sequenceRepository.ts` implements `stripEmptyStrings()` to recursively remove empty string values before Firestore writes. This prevents Firestore from storing `""` values. The `description` field additionally uses `deleteField()` when set to empty string.

## Migration Strategy

Three one-time migration scripts in `scripts/`:

1. **`migrateFirestore.ts`** — Type normalization (old types → current types)
2. **`migrateStepsToCollection.ts`** — Embedded steps → standalone `steps` collection
3. **`normalizeSequences.ts`** — Combined: type normalization + embedding → references

All use `firebase-admin` SDK with service account authentication. Scripts are idempotent (detect already-migrated data).

## Data Ownership

| Collection | Writer | Reader |
|------------|--------|--------|
| `sequences` | Web + Android | Web + Android |
| `steps` | Web + Android | Web + Android |
| `tasks` | Android only | Web (read-only) |
| `sequence_runs` | Android only | Web (read-only) |
| `notes` | Web + Android (planned) | Web + Android (planned) |
| `moods` | Android only (planned) | Web (read-only, planned) |
| `health_snapshots` | Android only (planned) | Web (read-only, planned) |
| `food_log_items` | Web + Android (planned) | Web + Android (planned) |
| `products` | Android only (planned) | Web (read-only, planned) |
| `food_cache` | Android only (planned) | Web (read-only, planned) |

## Timeout Handling

All Firestore calls are wrapped in a `withTimeout` helper:
```typescript
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
    ),
  ]);
}
```
Timeout: **10 seconds** for all repositories.
