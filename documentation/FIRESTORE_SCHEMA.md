# Firestore Schema

## Collections

### `sequences`

| Field | Type | Required |
|---|---|---|
| `name` | `string` | yes |
| `steps` | `array<StepReference>` | yes |
| `repeatMode` | `'once' \| 'until_done' \| 'count'` | yes |
| `repeatCount` | `number` | yes |
| `isDeleted` | `boolean` | yes |
| `createdAt` | `string` (ISO 8601) | yes |
| `lastModifiedAt` | `string` (ISO 8601) | yes |
| `pendingFirestoreSync` | `boolean` | yes |

**StepReference**: `{ stepId: string, position: number }`

Sequences store only step references — all step details live in the `steps` collection.

**Indexes:**
- `isDeleted` ASC + `name` ASC → [create](https://console.firebase.google.com/v1/r/project/autistic-8e840/firestore/indexes?create_composite=ClBwcm9qZWN0cy9hdXRpc3RpYy04ZTg0MC9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvc2VxdWVuY2VzL2luZGV4ZXMvXxABGg0KCWlzRGVsZXRlZBABGggKBG5hbWUQARoMCghfX25hbWVfXxAB)

---

### `steps`

| Field | Type | Required |
|---|---|---|
| `type` | `'repetition' \| 'repeat_group' \| 'action'` | yes |
| `title` | `string` | yes |
| `instructions` | `string` | yes |
| `media` | `array<MediaAttachment>` | yes |
| `equipment` | `string` | yes (repetition) |
| `unit` | `'none' \| 'weight' \| 'seconds'` | yes (repetition) |
| `steps` | `number` | yes (repetition) |
| `reps` | `number` | yes (repetition) |
| `weightLb` | `number` | yes (repetition) |
| `durationSeconds` | `number` | yes (repetition) |
| `restBetweenSetsSeconds` | `number` | yes (repetition) |
| `voiceActivation` | `boolean` | yes (repetition) |
| `durationMinutes` | `number` | yes (action) |
| `timerEndBehavior` | `'none' \| 'notification'` | yes (action) |
| `useDuration` | `boolean` | yes (action) |
| `childSteps` | `array<StepReference>` | yes (repeat_group) |
| `isDeleted` | `boolean` | yes |
| `usedBy` | `array<string>` | yes |
| `createdAt` | `string` (ISO 8601) | yes |
| `lastModifiedAt` | `string` (ISO 8601) | yes |

Steps are standalone documents. Child steps in `repeat_group` steps are stored as `StepReference[]` (by ID, not embedded).

**MediaAttachment**: `{ url: string, scale: number, x?: number, y?: number }`

**Indexes:**
- `isDeleted` ASC + `title` ASC → [create](https://console.firebase.google.com/v1/r/project/autistic-8e840/firestore/indexes?create_composite=ClBwcm9qZWN0cy9hdXRpc3RpYy04ZTg0MC9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvc3RlcHMvaW5kZXhlcy9fEAEaDQoJaXNEZWxldGVkEAEaCQoFdGl0bGUQARoMCghfX25hbWVfXxAB)

---

### `tasks`

| Field | Type | Required |
|---|---|---|
| `task` | `string` | yes |
| `category` | `string` | yes |
| `dueAt` | `string \| null` (ISO 8601) | no |
| `expectedTimeMinutes` | `number \| null` | no |
| `isImportant` | `boolean` | yes |
| `notes` | `string \| null` | no |
| `dailyTaskId` | `string \| null` | no |
| `completedAt` | `string \| null` (ISO 8601) | no |
| `createdAt` | `string` (ISO 8601) | yes |

**Queries:**
- `fetchIncompleteTasks`: `where('completedAt', '==', null)` — single-field, no composite index needed
- `fetchCompletedToday`: `where('completedAt', '>=', todayStart)` + `where('completedAt', '<=', todayEnd)` — single-field range, no composite index needed

---

### `sequence_runs`

| Field | Type | Required |
|---|---|---|
| `sequenceId` | `string` | yes |
| `startedAt` | `string` (ISO 8601) | yes |
| `completedAt` | `string \| null` | no |
| `stepRecords` | `array<StepRecord>` | yes |

**StepRecord**: `{ stepId: string, stepType: string, label: string, sets: SetRecord[] }`

**SetRecord**: `{ setNumber: number, weight?: number, reps?: number, durationSeconds?: number }`

**Indexes:**
- `completedAt` ASC → single-field, auto-created when you run the query
- `startedAt` DESC → single-field, auto-created when you run the query
- `sequenceId` ASC + `startedAt` DESC → [create](https://console.firebase.google.com/v1/r/project/autistic-8e840/firestore/indexes?create_composite=ClBwcm9qZWN0cy9hdXRpc3RpYy04ZTg0MC9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvc2VxdWVuY2VzL2luZGV4ZXMvXxABGg0KCXNlcXVlbmNlSWQQARoMCghzdGFydGVkQXQQARoMCghfX25hbWVfXxAB)
