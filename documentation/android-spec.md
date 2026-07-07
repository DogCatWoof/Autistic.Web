# Android App Spec — Autistic.web

## Firebase Project

| Item | Value |
|---|---|
| Project ID | `autistic-8e840` |
| Web API Key | `AIzaSyBjN0hFxGXPaWQQjuKd78pmdLCkkIFsuXA` |
| Auth | Firebase Auth — Google Sign-In only |
| Firestore | Native mode, `us-central1` |
| Indexes | See below |

Auth watches `request.auth.uid` in security rules. Every read/write requires authentication.

---

## Collections

### `sequences`

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | user-visible title |
| `description` | string | no | optional blurb, omitted when blank |
| `steps` | `SequenceStep[]` | yes | ordered array, see below |
| `isDeleted` | boolean | yes | soft-delete flag |
| `createdAt` | string (ISO 8601) | yes | set once |
| `lastModifiedAt` | string (ISO 8601) | yes | updated on every save |
| `pendingFirestoreSync` | boolean | yes | true after web write, Android clears |

#### SequenceStep (discriminated union on `type`)

All steps extend `StepBase`: `id` (string, `crypto.randomUUID()`), `type` (string), `position` (number, 1-based), `title` (string), `instructions` (string), `media` (`MediaAttachment[]`).

> **Blank string fields** — The web app omits empty `""` string values from Firestore saves. This affects `title`, `instructions`, `equipment`, and `description`. Android should treat a missing field as `""`.

**type = `"repetition"`** (consolidated from old `exercise`/`stretch`)

| Field | Type | Notes |
|---|---|---|
| `equipment` | string | e.g. machine name, mat |
| `unit` | `"none" \| "weight" \| "seconds"` | controls which value field is active |
| `steps` | number | number of sets (default 3) |
| `reps` | number | reps per set (default 10) |
| `weightLb` | number | only relevant when `unit = "weight"` |
| `durationSeconds` | number | only relevant when `unit = "seconds"` |
| `restBetweenSetsSeconds` | number | rest timer between sets (default 20) |
| `voiceActivation` | boolean | Android uses this for hands-free start |

**type = `"repeat_group"`**

| Field | Type | Notes |
|---|---|---|
| `steps` | `SequenceStep[]` | recursive — contains sub-steps that repeat until done |

**type = `"action"`** (supersedes legacy `timer` type)

| Field | Type | Notes |
|---|---|---|
| `durationMinutes` | number | only relevant when `useDuration = true` |
| `timerEndBehavior` | `"none" \| "notification"` | only relevant when `useDuration = true` |
| `useDuration` | boolean | enables/disables duration timer for this step |

#### MediaAttachment

```json
{ "url": "string", "scale": "number", "x?": "number", "y?": "number" }
```

---

### `sequence_runs`

| Field | Type | Notes |
|---|---|---|
| `sequenceId` | string | FK to `sequences` doc |
| `startedAt` | string (ISO 8601) | when run started |
| `completedAt` | string (ISO 8601) | null = in progress |
| `stepRecords` | `StepRecord[]` | per-step progress |

#### StepRecord

```json
{ "stepId": "string", "stepType": "string", "label": "string", "sets": "SetRecord[]" }
```

#### SetRecord

```json
{ "setNumber": "number", "weight?": "number", "reps?": "number", "durationSeconds?": "number" }
```

The Android app WRITES `sequence_runs`; the web reads them as read-only history.

---

## Indexes

### Composite indexes (must exist)

1. **`sequences`**: `isDeleted` ASC + `name` ASC
2. **`sequence_runs`**: `sequenceId` ASC + `startedAt` DESC

### Single-field indexes (auto-created)

- `sequence_runs.completedAt` ASC (for active-run query)
- `sequence_runs.startedAt` DESC (for history)

---

## Business Logic Notes

- **Repeat groups**: Only step-level repeat groups exist. There is **no** sequence-level repeat mode anymore. Sequences always run once; only `repeat_group` steps repeat.
- **Soft delete**: `sequences.isDeleted = true` means deleted. Reads filter with `where('isDeleted', '==', false)`.
- **Sync flag**: `pendingFirestoreSync = true` is set by any web write. Android should query for this flag, process changes, and clear it after syncing.
- **Auth**: Google Sign-In only. Firestore rules check `request.auth.uid != null`.
